import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import path from "node:path"

import { transformJsx } from "./babel-test-utils.js"

// CHANGE: extract JSX transformation tests to separate file.
// WHY: comply with max-lines ESLint rule (300 lines limit).
// REF: issue-25
// FORMAT THEOREM: ∀ jsx ∈ JSXOpeningElement: transform(jsx) → contains(output, data-path attribute)
// PURITY: SHELL tests (effect verification)
// INVARIANT: all JSX elements are tagged with data-path attribute, no duplicates
// COMPLEXITY: O(n) per transform where n = JSX elements

describe("babel-plugin JSX transformations", () => {
  it.effect("transforms simple JSX element with data-path attribute", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return <div>Hello</div>
        }
      `
      const testFilename = path.resolve("/project", "src/App.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      expect(result?.code).toContain("data-path=\"src/App.tsx:")
      expect(result?.code).toContain("<div")
    }))

  it.effect("transforms multiple JSX elements", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return (
            <div>
              <header>Title</header>
              <main>Content</main>
            </div>
          )
        }
      `
      const testFilename = path.resolve("/project", "src/App.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      // Should contain data-path attributes for div, header, and main
      const pathMatches = result?.code?.match(/data-path="src\/App\.tsx:\d+:\d+"/g)
      expect(pathMatches).toBeDefined()
      expect(pathMatches?.length).toBeGreaterThanOrEqual(3)
    }))

  it.effect("does not add duplicate data-path attribute (idempotency)", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return <div data-path="existing:1:0">Hello</div>
        }
      `
      const testFilename = path.resolve("/project", "src/App.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      // Should keep the existing data-path attribute
      expect(result?.code).toContain("data-path=\"existing:1:0\"")
      // Count data-path attributes - should only be one
      const pathMatches = result?.code?.match(/data-path="/g)
      expect(pathMatches?.length).toBe(1)
    }))

  it.effect("does not interfere with other path-like attributes", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return <img src="/image.png" alt="test" />
        }
      `
      const testFilename = path.resolve("/project", "src/App.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      // Should preserve src attribute
      expect(result?.code).toContain("src=\"/image.png\"")
      // Should add data-path attribute
      expect(result?.code).toContain("data-path=\"src/App.tsx:")
    }))

  it.effect("handles JSX with existing attributes", () =>
    Effect.sync(() => {
      const code = `
        function Button() {
          return <button className="btn" id="submit" onClick={handleClick}>Click</button>
        }
      `
      const testFilename = path.resolve("/project", "src/components/Button.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      // Should preserve existing attributes
      expect(result?.code).toContain("className=\"btn\"")
      expect(result?.code).toContain("id=\"submit\"")
      expect(result?.code).toContain("onClick={handleClick}")
      // Should add data-path attribute
      expect(result?.code).toContain("data-path=\"src/components/Button.tsx:")
    }))

  it.effect("handles self-closing JSX elements", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return <input type="text" />
        }
      `
      const testFilename = path.resolve("/project", "src/App.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      expect(result?.code).toContain("data-path=\"src/App.tsx:")
      expect(result?.code).toContain("type=\"text\"")
    }))

  it.effect("handles nested JSX components", () =>
    Effect.sync(() => {
      const code = `
        function Page() {
          return (
            <Layout>
              <Header>
                <Logo />
                <Nav />
              </Header>
              <Content>
                <Article />
              </Content>
            </Layout>
          )
        }
      `
      const testFilename = path.resolve("/project", "src/pages/Page.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      // All components should be tagged
      const pathMatches = result?.code?.match(/data-path="src\/pages\/Page\.tsx:\d+:\d+"/g)
      expect(pathMatches).toBeDefined()
      expect(pathMatches?.length).toBeGreaterThanOrEqual(6) // Layout, Header, Logo, Nav, Content, Article
    }))

  it.effect("handles JSX fragments", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return (
            <>
              <div>First</div>
              <div>Second</div>
            </>
          )
        }
      `
      const testFilename = path.resolve("/project", "src/App.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      // Fragments don't get tagged, but their children do
      const pathMatches = result?.code?.match(/data-path="/g)
      expect(pathMatches?.length).toBeGreaterThanOrEqual(2) // Two div elements
    }))

  it.effect("handles JSX with spread attributes", () =>
    Effect.sync(() => {
      const code = `
        function App(props) {
          return <div {...props}>Content</div>
        }
      `
      const testFilename = path.resolve("/project", "src/App.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      expect(result?.code).toContain("{...props}")
      expect(result?.code).toContain("data-path=\"src/App.tsx:")
    }))

  it.effect("handles TypeScript JSX generics", () =>
    Effect.sync(() => {
      const code = `
        function Generic<T>() {
          return <div>Generic Component</div>
        }
      `
      const testFilename = path.resolve("/project", "src/Generic.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      expect(result?.code).toContain("data-path=\"src/Generic.tsx:")
    }))

  it.effect("correctly formats data-path with line and column", () =>
    Effect.sync(() => {
      const code = `function App() {
  return <div>Test</div>
}`
      const testFilename = path.resolve("/project", "src/App.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      // The data-path should contain line 2 (where <div> is) and column number
      expect(result?.code).toMatch(/data-path="src\/App\.tsx:2:\d+"/)
    }))

  it.effect("handles components with multiple props on multiple lines", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return (
            <button
              className="primary"
              onClick={handleClick}
              disabled={false}
            >
              Submit
            </button>
          )
        }
      `
      const testFilename = path.resolve("/project", "src/App.tsx")

      const result = transformJsx(code, testFilename, { rootDir: "/project" })

      expect(result).not.toBeNull()
      expect(result?.code).toContain("data-path=\"src/App.tsx:")
      expect(result?.code).toContain("className=\"primary\"")
      expect(result?.code).toContain("onClick={handleClick}")
    }))
})

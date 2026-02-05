import { transformSync } from "@babel/core"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import { componentTaggerBabelPlugin } from "../../src/shell/babel-plugin.js"

// CHANGE: add integration tests for Babel plugin transformation
// WHY: ensure plugin correctly transforms JSX fixtures and handles edge cases
// QUOTE(ТЗ): "Integration: Babel plugin transforms fixture → содержит data-path"
// REF: issue-25
// FORMAT THEOREM: ∀ jsx ∈ JSXCode: transform(jsx) → contains(result, "path=")
// PURITY: SHELL tests (effect verification)
// INVARIANT: transformed code contains path attributes, no duplicates
// COMPLEXITY: O(n) per transform where n = JSX elements

// CHANGE: extract transform helper to module scope per linter requirement
// WHY: unicorn/consistent-function-scoping rule enforces scope consistency
// REF: ESLint unicorn plugin rules
const transformBabel = (code: string, filename = "test.tsx", rootDir = "/project"): string | null => {
  const result = transformSync(code, {
    filename,
    babelrc: false,
    configFile: false,
    parserOpts: {
      sourceType: "module",
      plugins: ["typescript", "jsx"]
    },
    plugins: [[componentTaggerBabelPlugin, { rootDir }]]
  })
  return result?.code ?? null
}

describe("babel-plugin", () => {
  describe("componentTaggerBabelPlugin", () => {
    // FORMAT THEOREM: ∀ jsx ∈ JSXOpeningElement: transform(jsx) → contains(output, path attribute)
    // INVARIANT: all JSX elements are tagged with path attribute
    // COMPLEXITY: O(n) where n = number of JSX elements

    it.effect("transforms simple JSX element with path attribute", () =>
      Effect.sync(() => {
        const input = `
          function App() {
            return <div>Hello</div>
          }
        `

        const output = transformBabel(input, "/project/src/App.tsx")

        expect(output).not.toBeNull()
        expect(output).toContain("path=\"src/App.tsx:")
        expect(output).toContain("<div")
      }))

    it.effect("transforms multiple JSX elements", () =>
      Effect.sync(() => {
        const input = `
          function App() {
            return (
              <div>
                <header>Title</header>
                <main>Content</main>
              </div>
            )
          }
        `

        const output = transformBabel(input, "/project/src/App.tsx")

        expect(output).not.toBeNull()
        // Should contain path attributes for div, header, and main
        const pathMatches = output?.match(/path="src\/App\.tsx:\d+:\d+"/g)
        expect(pathMatches).toBeDefined()
        expect(pathMatches?.length).toBeGreaterThanOrEqual(3)
      }))

    it.effect("does not add duplicate path attribute (idempotency)", () =>
      Effect.sync(() => {
        const input = `
          function App() {
            return <div path="existing:1:0">Hello</div>
          }
        `

        const output = transformBabel(input, "/project/src/App.tsx")

        expect(output).not.toBeNull()
        // Should keep the existing path attribute
        expect(output).toContain("path=\"existing:1:0\"")
        // Count path attributes - should only be one
        const pathMatches = output?.match(/path="/g)
        expect(pathMatches?.length).toBe(1)
      }))

    it.effect("does not interfere with other path-like attributes", () =>
      Effect.sync(() => {
        const input = `
          function App() {
            return <img src="/image.png" alt="test" />
          }
        `

        const output = transformBabel(input, "/project/src/App.tsx")

        expect(output).not.toBeNull()
        // Should preserve src attribute
        expect(output).toContain("src=\"/image.png\"")
        // Should add path attribute
        expect(output).toContain("path=\"src/App.tsx:")
      }))

    it.effect("handles JSX with existing attributes", () =>
      Effect.sync(() => {
        const input = `
          function Button() {
            return <button className="btn" id="submit" onClick={handleClick}>Click</button>
          }
        `

        const output = transformBabel(input, "/project/src/components/Button.tsx")

        expect(output).not.toBeNull()
        // Should preserve existing attributes
        expect(output).toContain("className=\"btn\"")
        expect(output).toContain("id=\"submit\"")
        expect(output).toContain("onClick={handleClick}")
        // Should add path attribute
        expect(output).toContain("path=\"src/components/Button.tsx:")
      }))

    it.effect("handles self-closing JSX elements", () =>
      Effect.sync(() => {
        const input = `
          function App() {
            return <input type="text" />
          }
        `

        const output = transformBabel(input, "/project/src/App.tsx")

        expect(output).not.toBeNull()
        expect(output).toContain("path=\"src/App.tsx:")
        expect(output).toContain("type=\"text\"")
      }))

    it.effect("handles nested JSX components", () =>
      Effect.sync(() => {
        const input = `
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

        const output = transformBabel(input, "/project/src/pages/Page.tsx")

        expect(output).not.toBeNull()
        // All components should be tagged
        const pathMatches = output?.match(/path="src\/pages\/Page\.tsx:\d+:\d+"/g)
        expect(pathMatches).toBeDefined()
        expect(pathMatches?.length).toBeGreaterThanOrEqual(6) // Layout, Header, Logo, Nav, Content, Article
      }))

    it.effect("handles JSX fragments", () =>
      Effect.sync(() => {
        const input = `
          function App() {
            return (
              <>
                <div>First</div>
                <div>Second</div>
              </>
            )
          }
        `

        const output = transformBabel(input, "/project/src/App.tsx")

        expect(output).not.toBeNull()
        // Fragments don't get tagged, but their children do
        const pathMatches = output?.match(/path="/g)
        expect(pathMatches?.length).toBeGreaterThanOrEqual(2) // Two div elements
      }))

    it.effect("skips non-JSX files", () =>
      Effect.sync(() => {
        const input = `
          function greet() {
            return "hello"
          }
        `

        const output = transformBabel(input, "/project/src/utils.ts")

        expect(output).not.toBeNull()
        expect(output).not.toContain("path=\"")
      }))

    it.effect("uses custom rootDir option", () =>
      Effect.sync(() => {
        const input = `
          function App() {
            return <div>Test</div>
          }
        `

        const output = transformBabel(input, "/custom/root/src/App.tsx", "/custom/root")

        expect(output).not.toBeNull()
        expect(output).toContain("path=\"src/App.tsx:")
      }))

    it.effect("handles JSX with spread attributes", () =>
      Effect.sync(() => {
        const input = `
          function App(props) {
            return <div {...props}>Content</div>
          }
        `

        const output = transformBabel(input, "/project/src/App.tsx")

        expect(output).not.toBeNull()
        expect(output).toContain("{...props}")
        expect(output).toContain("path=\"src/App.tsx:")
      }))

    it.effect("handles TypeScript JSX generics", () =>
      Effect.sync(() => {
        const input = `
          function Generic<T>() {
            return <div>Generic Component</div>
          }
        `

        const output = transformBabel(input, "/project/src/Generic.tsx")

        expect(output).not.toBeNull()
        expect(output).toContain("path=\"src/Generic.tsx:")
      }))

    it.effect("correctly formats path with line and column", () =>
      Effect.sync(() => {
        const input = `function App() {
  return <div>Test</div>
}`

        const output = transformBabel(input, "/project/src/App.tsx")

        expect(output).not.toBeNull()
        // The path should contain line 2 (where <div> is) and column number
        expect(output).toMatch(/path="src\/App\.tsx:2:\d+"/)
      }))

    it.effect("handles components with multiple props on multiple lines", () =>
      Effect.sync(() => {
        const input = `
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

        const output = transformBabel(input, "/project/src/App.tsx")

        expect(output).not.toBeNull()
        expect(output).toContain("path=\"src/App.tsx:")
        expect(output).toContain("className=\"primary\"")
        expect(output).toContain("onClick={handleClick}")
      }))
  })
})

import { describe, it } from "@effect/vitest"
import { Effect } from "effect"

import { transformAndValidateJsx } from "./babel-test-utils.js"

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
      const { expectContains } = transformAndValidateJsx(code, "src/App.tsx")

      expectContains("data-path=\"src/App.tsx:")
      expectContains("<div")
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
      const { expectDataPathMinCount } = transformAndValidateJsx(code, "src/App.tsx")

      // Should contain data-path attributes for div, header, and main
      expectDataPathMinCount(3)
    }))

  it.effect("does not add duplicate data-path attribute (idempotency)", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return <div data-path="existing:1:0">Hello</div>
        }
      `
      const { expectContains, expectDataPathCount } = transformAndValidateJsx(code, "src/App.tsx")

      // Should keep the existing data-path attribute
      expectContains("data-path=\"existing:1:0\"")
      // Count data-path attributes - should only be one
      expectDataPathCount(1)
    }))

  it.effect("does not interfere with other path-like attributes", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return <img src="/image.png" alt="test" />
        }
      `
      const { expectContains } = transformAndValidateJsx(code, "src/App.tsx")

      // Should preserve src attribute
      expectContains("src=\"/image.png\"")
      // Should add data-path attribute
      expectContains("data-path=\"src/App.tsx:")
    }))

  it.effect("handles JSX with existing attributes", () =>
    Effect.sync(() => {
      const code = `
        function Button() {
          return <button className="btn" id="submit" onClick={handleClick}>Click</button>
        }
      `
      const { expectContains } = transformAndValidateJsx(code, "src/components/Button.tsx")

      // Should preserve existing attributes
      expectContains("className=\"btn\"")
      expectContains("id=\"submit\"")
      expectContains("onClick={handleClick}")
      // Should add data-path attribute
      expectContains("data-path=\"src/components/Button.tsx:")
    }))

  it.effect("handles self-closing JSX elements", () =>
    Effect.sync(() => {
      const code = `
        function App() {
          return <input type="text" />
        }
      `
      const { expectContains } = transformAndValidateJsx(code, "src/App.tsx")

      expectContains("data-path=\"src/App.tsx:")
      expectContains("type=\"text\"")
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
      const { expectDataPathMinCount } = transformAndValidateJsx(code, "src/pages/Page.tsx")

      // All components should be tagged: Layout, Header, Logo, Nav, Content, Article
      expectDataPathMinCount(6)
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
      const { expectDataPathMinCount } = transformAndValidateJsx(code, "src/App.tsx")

      // Fragments don't get tagged, but their children do (two div elements)
      expectDataPathMinCount(2)
    }))

  it.effect("handles JSX with spread attributes", () =>
    Effect.sync(() => {
      const code = `
        function App(props) {
          return <div {...props}>Content</div>
        }
      `
      const { expectContains } = transformAndValidateJsx(code, "src/App.tsx")

      expectContains("{...props}")
      expectContains("data-path=\"src/App.tsx:")
    }))

  it.effect("handles TypeScript JSX generics", () =>
    Effect.sync(() => {
      const code = `
        function Generic<T>() {
          return <div>Generic Component</div>
        }
      `
      const { expectContains } = transformAndValidateJsx(code, "src/Generic.tsx")

      expectContains("data-path=\"src/Generic.tsx:")
    }))

  it.effect("correctly formats data-path with line and column", () =>
    Effect.sync(() => {
      const code = `function App() {
  return <div>Test</div>
}`
      const { expectMatch } = transformAndValidateJsx(code, "src/App.tsx")

      // The data-path should contain line 2 (where <div> is) and column number
      expectMatch(/data-path="src\/App\.tsx:2:\d+"/)
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
      const { expectContains } = transformAndValidateJsx(code, "src/App.tsx")

      expectContains("data-path=\"src/App.tsx:")
      expectContains("className=\"primary\"")
      expectContains("onClick={handleClick}")
    }))
})

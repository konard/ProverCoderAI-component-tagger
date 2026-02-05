import { type TransformOptions, transformSync } from "@babel/core"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import path from "node:path"

import { componentTaggerBabelPlugin, type ComponentTaggerBabelPluginOptions } from "../../src/shell/babel-plugin.js"

// CHANGE: merge tests from issue-16 (rootDir) and issue-25 (comprehensive transformations).
// WHY: ensure plugin correctly handles rootDir fallbacks AND transforms JSX fixtures with data-path.
// QUOTE(issue-25): "Integration: Babel plugin transforms fixture → содержит data-path"
// QUOTE(issue-16): "При отсутствии rootDir и cwd относительный путь корректный (от process.cwd())"
// REF: issue-16, issue-25
// FORMAT THEOREM: ∀ jsx ∈ JSXCode: transform(jsx) → contains(result, "data-path=")
// PURITY: SHELL tests (effect verification)
// INVARIANT: transformed code contains path attributes, no duplicates
// COMPLEXITY: O(n) per transform where n = JSX elements

/**
 * Helper function to transform JSX code with the component tagger plugin.
 *
 * @param code - JSX source code to transform
 * @param filename - Absolute path to the file being transformed
 * @param options - Optional plugin configuration
 * @param cwd - Optional Babel working directory
 * @returns Transformed code result
 *
 * @pure false - performs Babel transformation
 * @complexity O(n) where n = code length
 */
const transformJsx = (
  code: string,
  filename: string,
  options?: ComponentTaggerBabelPluginOptions,
  cwd?: string
): ReturnType<typeof transformSync> => {
  const transformOptions: TransformOptions = {
    cwd,
    filename,
    parserOpts: {
      plugins: ["jsx", "typescript"]
    },
    plugins: options === undefined ? [componentTaggerBabelPlugin] : [[componentTaggerBabelPlugin, options]]
  }

  return transformSync(code, transformOptions)
}

/**
 * Helper function to verify transformed code contains expected path.
 *
 * @param result - Babel transform result
 * @param expectedPath - Expected relative path in the data-path attribute
 *
 * @pure true - only performs assertions
 * @complexity O(1)
 */
const expectPathAttribute = (result: ReturnType<typeof transformSync>, expectedPath: string): void => {
  expect(result).not.toBeNull()
  expect(result?.code).toBeDefined()
  expect(result?.code).toContain(`data-path="${expectedPath}:`)
}

describe("babel-plugin", () => {
  describe("plugin structure", () => {
    it.effect("creates a valid Babel plugin object", () =>
      Effect.sync(() => {
        const plugin = componentTaggerBabelPlugin()

        expect(plugin).toHaveProperty("name")
        expect(plugin).toHaveProperty("visitor")
        expect(plugin.name).toBe("component-path-babel-tagger")
        expect(typeof plugin.visitor).toBe("object")
      }))

    it.effect("exports default plugin factory", () =>
      Effect.gen(function*() {
        const module = yield* Effect.tryPromise(() => import("../../src/shell/babel-plugin.js"))
        const defaultExport = module.default

        expect(typeof defaultExport).toBe("function")

        const plugin = defaultExport()
        expect(plugin).toHaveProperty("name")
        expect(plugin.name).toBe("component-path-babel-tagger")
      }))
  })

  describe("rootDir configuration", () => {
    it.effect("uses process.cwd() when rootDir and cwd are missing", () =>
      Effect.sync(() => {
        const code = "const App = () => { return <div>Hello</div> }"
        const testFilename = path.resolve(process.cwd(), "src/TestComponent.tsx")

        const result = transformJsx(code, testFilename)

        expectPathAttribute(result, "src/TestComponent.tsx")
      }))

    it.effect("uses state.cwd when rootDir is missing", () =>
      Effect.sync(() => {
        const code = "const App = () => { return <div>Hello</div> }"
        const customCwd = "/custom/working/directory"
        const testFilename = path.resolve(customCwd, "src/TestComponent.tsx")

        const result = transformJsx(code, testFilename, undefined, customCwd)

        expectPathAttribute(result, "src/TestComponent.tsx")
      }))

    it.effect("prefers explicit rootDir option", () =>
      Effect.sync(() => {
        const code = "const App = () => { return <div>Hello</div> }"
        const customRoot = "/custom/root"
        const testFilename = path.resolve(customRoot, "components/TestComponent.tsx")

        const result = transformJsx(code, testFilename, { rootDir: customRoot })

        expectPathAttribute(result, "components/TestComponent.tsx")
      }))
  })

  describe("JSX transformations", () => {
    // FORMAT THEOREM: ∀ jsx ∈ JSXOpeningElement: transform(jsx) → contains(output, data-path attribute)
    // INVARIANT: all JSX elements are tagged with data-path attribute
    // COMPLEXITY: O(n) where n = number of JSX elements

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

    it.effect("skips non-JSX files", () =>
      Effect.sync(() => {
        const code = "const value = 42"
        const testFilename = path.resolve(process.cwd(), "src/utils.ts")

        const result = transformSync(code, {
          filename: testFilename,
          parserOpts: { plugins: ["typescript"] },
          plugins: [componentTaggerBabelPlugin]
        })

        expect(result).not.toBeNull()
        expect(result?.code).toBeDefined()
        expect(result?.code).not.toContain("data-path=\"")
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

  describe("custom attributeName", () => {
    it.effect("uses custom attribute name when provided", () =>
      Effect.sync(() => {
        const code = "const App = () => { return <div>Hello</div> }"
        const testFilename = path.resolve("/project", "src/App.tsx")

        const result = transformJsx(code, testFilename, {
          rootDir: "/project",
          attributeName: "custom-path"
        })

        expect(result).not.toBeNull()
        expect(result?.code).toContain("custom-path=\"src/App.tsx:")
        expect(result?.code).not.toContain("data-path=")
      }))

    it.effect("respects idempotency with custom attribute name", () =>
      Effect.sync(() => {
        const code = `
          function App() {
            return <div custom-path="existing:1:0">Hello</div>
          }
        `
        const testFilename = path.resolve("/project", "src/App.tsx")

        const result = transformJsx(code, testFilename, {
          rootDir: "/project",
          attributeName: "custom-path"
        })

        expect(result).not.toBeNull()
        // Should keep the existing custom-path attribute
        expect(result?.code).toContain("custom-path=\"existing:1:0\"")
        // Count custom-path attributes - should only be one
        const pathMatches = result?.code?.match(/custom-path="/g)
        expect(pathMatches?.length).toBe(1)
      }))
  })
})

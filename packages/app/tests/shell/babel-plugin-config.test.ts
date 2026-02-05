import { transformSync } from "@babel/core"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import path from "node:path"

import { componentTaggerBabelPlugin } from "../../src/shell/babel-plugin.js"
import { expectPathAttribute, transformJsx } from "./babel-test-utils.js"

// CHANGE: extract plugin configuration and rootDir tests to separate file.
// WHY: comply with max-lines ESLint rule (300 lines limit).
// REF: issue-16, issue-25
// FORMAT THEOREM: ∀ config ∈ Config: valid(config) → plugin_works(config)
// PURITY: SHELL tests (effect verification)
// INVARIANT: plugin respects rootDir configuration hierarchy
// COMPLEXITY: O(n) per transform where n = JSX elements

describe("babel-plugin configuration", () => {
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

  describe("file type filtering", () => {
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
  })
})

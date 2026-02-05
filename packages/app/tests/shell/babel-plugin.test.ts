import { type TransformOptions, transformSync } from "@babel/core"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import path from "node:path"

import { componentTaggerBabelPlugin, type ComponentTaggerBabelPluginOptions } from "../../src/shell/babel-plugin.js"

// CHANGE: add tests for rootDir fallback to process.cwd().
// WHY: ensure correct relative path computation when rootDir and cwd are missing.
// QUOTE(ТЗ): "При отсутствии rootDir и cwd относительный путь корректный (от process.cwd()). Добавить тест/fixture для этого случая."
// REF: issue-16
// SOURCE: n/a
// FORMAT THEOREM: ∀ state: state.opts.rootDir = undefined ∧ state.cwd = undefined → rootDir = process.cwd()
// PURITY: SHELL
// EFFECT: Effect<void, never, never>
// INVARIANT: plugin returns valid Babel PluginObj and computes correct relative paths
// COMPLEXITY: O(1)/O(1)

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
 * @param expectedPath - Expected relative path in the path attribute
 *
 * @pure true - only performs assertions
 * @complexity O(1)
 */
const expectPathAttribute = (result: ReturnType<typeof transformSync>, expectedPath: string): void => {
  expect(result).not.toBeNull()
  expect(result?.code).toBeDefined()
  expect(result?.code).toContain(`path="${expectedPath}:`)
}

describe("babel-plugin", () => {
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
      expect(result?.code).not.toContain("path=\"")
    }))
})

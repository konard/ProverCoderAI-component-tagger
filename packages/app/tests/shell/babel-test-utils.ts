import { type TransformOptions, transformSync } from "@babel/core"
import { expect } from "@effect/vitest"

import { componentTaggerBabelPlugin, type ComponentTaggerBabelPluginOptions } from "../../src/shell/babel-plugin.js"

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
export const transformJsx = (
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
export const expectPathAttribute = (result: ReturnType<typeof transformSync>, expectedPath: string): void => {
  expect(result).not.toBeNull()
  expect(result?.code).toBeDefined()
  expect(result?.code).toContain(`data-path="${expectedPath}:`)
}

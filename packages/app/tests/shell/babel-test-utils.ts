import { type TransformOptions, transformSync } from "@babel/core"
import { expect } from "@effect/vitest"
import path from "node:path"

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

/**
 * Helper function to transform and validate JSX code.
 * Reduces test code duplication by combining transform + null check.
 *
 * @param code - JSX source code to transform
 * @param relativeFilePath - Relative file path (e.g., "src/App.tsx")
 * @param options - Optional plugin configuration
 * @returns Object with result and helper methods
 *
 * @pure false - performs Babel transformation
 * @complexity O(n) where n = code length
 */
export const transformAndValidateJsx = (
  code: string,
  relativeFilePath: string,
  options?: ComponentTaggerBabelPluginOptions
) => {
  const rootDir = "/project"
  const filename = path.resolve(rootDir, relativeFilePath)
  const result = transformJsx(code, filename, { rootDir, ...options })

  expect(result).not.toBeNull()

  return {
    result,
    code: result?.code ?? "",
    expectContains: (substring: string) => {
      expect(result?.code).toContain(substring)
    },
    expectMatch: (pattern: RegExp) => {
      expect(result?.code).toMatch(pattern)
    },
    expectDataPathCount: (count: number) => {
      const attributeName = options?.attributeName ?? "data-path"
      const pathMatches = result?.code?.match(new RegExp(`${attributeName}="`, "g"))
      expect(pathMatches?.length).toBe(count)
    },
    expectDataPathMinCount: (minCount: number) => {
      const attributeName = options?.attributeName ?? "data-path"
      const pathMatches = result?.code?.match(new RegExp(String.raw`${attributeName}="[^"]+:\d+:\d+"`, "g"))
      expect(pathMatches).toBeDefined()
      expect(pathMatches?.length).toBeGreaterThanOrEqual(minCount)
    }
  }
}

/**
 * Creates a standard test filename path for the project.
 *
 * @param relativeFilePath - Relative file path (e.g., "src/App.tsx")
 * @returns Absolute path resolved from /project
 *
 * @pure true - no side effects
 * @complexity O(1)
 */
export const createTestFilePath = (relativeFilePath: string): string => path.resolve("/project", relativeFilePath)

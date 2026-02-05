import { type PluginObj, types as t } from "@babel/core"
import path from "node:path"

import { isJsxFile } from "../core/component-path.js"
import { createJsxTaggerVisitor, type JsxTaggerContext } from "../core/jsx-tagger.js"

/**
 * Options for the component path Babel plugin.
 */
export type ComponentTaggerBabelPluginOptions = {
  /**
   * Root directory for computing relative paths.
   * Defaults to process.cwd().
   */
  readonly rootDir?: string
}

type BabelState = {
  readonly filename?: string
  readonly cwd?: string
  readonly opts?: ComponentTaggerBabelPluginOptions
}

/**
 * Creates context for JSX tagging from Babel state.
 *
 * @param state - Babel plugin state containing filename and options.
 * @returns JsxTaggerContext or null if context cannot be created.
 *
 * @pure true
 * @invariant returns null when filename is undefined or not a JSX file
 * @complexity O(n) where n = path length
 */
// CHANGE: extract context creation for standalone Babel plugin.
// WHY: enable unified visitor to work with Babel state.
// QUOTE(TZ): "А ты можешь сделать что бы бизнес логика оставалось одной?"
// REF: issue-12-comment (unified interface request)
// FORMAT THEOREM: ∀ state: getContext(state) = context ↔ isValidState(state)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: context contains valid relative path
// COMPLEXITY: O(n)/O(1)
const getContextFromState = (state: BabelState): JsxTaggerContext | null => {
  const filename = state.filename

  // Skip if no filename
  if (filename === undefined) {
    return null
  }

  // Skip if not a JSX/TSX file
  if (!isJsxFile(filename)) {
    return null
  }

  // Compute relative path from root
  const rootDir = state.opts?.rootDir ?? state.cwd ?? process.cwd()
  const relativeFilename = path.relative(rootDir, filename)

  return { relativeFilename }
}

/**
 * Creates a Babel plugin that injects component path attributes into JSX elements.
 *
 * This plugin is designed to be used standalone with build tools that support
 * Babel plugins directly (e.g., Next.js via .babelrc).
 *
 * Uses the unified JSX tagger core that is shared with the Vite plugin,
 * ensuring consistent behavior across both build tools.
 *
 * @returns Babel plugin object
 *
 * @pure false
 * @effect Babel AST transformation
 * @invariant JSX elements are tagged with path attribute containing file:line:column
 * @complexity O(n) where n = number of JSX elements
 *
 * @example
 * // .babelrc or babel.config.js
 * {
 *   "plugins": ["@prover-coder-ai/component-tagger/babel"]
 * }
 *
 * @example
 * // Next.js .babelrc with options
 * {
 *   "presets": ["next/babel"],
 *   "env": {
 *     "development": {
 *       "plugins": [
 *         ["@prover-coder-ai/component-tagger/babel", { "rootDir": "/custom/root" }]
 *       ]
 *     }
 *   }
 * }
 */
// CHANGE: use unified JSX tagger visitor from core module.
// WHY: share business logic between Vite and Babel plugins as requested.
// QUOTE(TZ): "А ты можешь сделать что бы бизнес логика оставалось одной? Ну типо переиспользуй код с vite версии на babel. Сделай единный интерфейс для этого"
// REF: issue-12-comment (unified interface request)
// SOURCE: https://babeljs.io/docs/plugins
// FORMAT THEOREM: forall jsx in JSXOpeningElement: transform(jsx) -> tagged(jsx, path)
// PURITY: SHELL
// EFFECT: Babel AST mutation
// INVARIANT: each JSX opening element has at most one path attribute
// COMPLEXITY: O(n)/O(1)
export const componentTaggerBabelPlugin = (): PluginObj<BabelState> => ({
  name: "component-path-babel-tagger",
  visitor: createJsxTaggerVisitor<BabelState>(getContextFromState, t)
})

/**
 * Default export for Babel plugin resolution.
 *
 * Babel resolves plugins by looking for a default export function that
 * returns a plugin object when called.
 */
// CHANGE: provide default export for standard Babel plugin resolution.
// WHY: Babel expects plugins to be functions that return plugin objects.
// REF: issue-12
// FORMAT THEOREM: forall babel: require(plugin) -> callable -> PluginObj
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: default export matches Babel plugin signature
// COMPLEXITY: O(1)/O(1)
export default componentTaggerBabelPlugin

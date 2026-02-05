import { type PluginObj, types as t } from "@babel/core"
import path from "node:path"

import { componentPathAttributeName, formatComponentPathValue, isJsxFile } from "../core/component-path.js"

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

const attrExists = (node: t.JSXOpeningElement, attrName: string): boolean =>
  node.attributes.some(
    (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: attrName })
  )

/**
 * Creates a Babel plugin that injects component path attributes into JSX elements.
 *
 * This plugin is designed to be used standalone with build tools that support
 * Babel plugins directly (e.g., Next.js via .babelrc).
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
// CHANGE: extract standalone Babel plugin from Vite integration.
// WHY: allow direct Babel usage for Next.js and other non-Vite build tools.
// QUOTE(TZ): "Создай новый проект типо packages/frontend только создай его для nextjs"
// REF: issue-12
// SOURCE: https://babeljs.io/docs/plugins
// FORMAT THEOREM: forall jsx in JSXOpeningElement: transform(jsx) -> tagged(jsx, path)
// PURITY: SHELL
// EFFECT: Babel AST mutation
// INVARIANT: each JSX opening element has at most one path attribute
// COMPLEXITY: O(n)/O(1)
export const componentTaggerBabelPlugin = (): PluginObj<BabelState> => ({
  name: "component-path-babel-tagger",
  visitor: {
    JSXOpeningElement(nodePath, state) {
      const { node } = nodePath
      const filename = state.filename

      // Skip if no filename
      if (filename === undefined) {
        return
      }

      // Skip if no location info
      if (node.loc === null || node.loc === undefined) {
        return
      }

      // Skip if not a JSX/TSX file
      if (!isJsxFile(filename)) {
        return
      }

      // Skip if already has path attribute
      if (attrExists(node, componentPathAttributeName)) {
        return
      }

      // Compute relative path from root
      const rootDir = state.opts?.rootDir ?? state.cwd ?? process.cwd()
      const relativeFilename = path.relative(rootDir, filename)

      const { column, line } = node.loc.start
      const value = formatComponentPathValue(relativeFilename, line, column)

      node.attributes.push(
        t.jsxAttribute(t.jsxIdentifier(componentPathAttributeName), t.stringLiteral(value))
      )
    }
  }
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

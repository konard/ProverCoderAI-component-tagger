/**
 * CommonJS entry point for the component-tagger Babel plugin.
 *
 * This file provides a CommonJS-compatible wrapper for the Babel plugin,
 * allowing it to be used with Next.js and other tools that require CJS modules.
 *
 * @example
 * // .babelrc
 * {
 *   "presets": ["next/babel"],
 *   "plugins": ["@prover-coder-ai/component-tagger/babel"]
 * }
 */
// CHANGE: provide CommonJS entry point for Babel plugin.
// WHY: Babel configuration often requires CommonJS modules.
// REF: issue-12
// FORMAT THEOREM: forall require: require(babel.cjs) -> PluginFactory
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: exports match Babel plugin signature
// COMPLEXITY: O(1)/O(1)

const path = require("node:path")

const componentPathAttributeName = "path"
const jsxFilePattern = /\.(tsx|jsx)(\?.*)?$/u

const isJsxFile = (id) => jsxFilePattern.test(id)

const formatComponentPathValue = (relativeFilename, line, column) =>
  `${relativeFilename}:${line}:${column}`

const attrExists = (node, attrName, t) =>
  node.attributes.some(
    (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: attrName })
  )

module.exports = function componentTaggerBabelPlugin({ types: t }) {
  return {
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
        if (attrExists(node, componentPathAttributeName, t)) {
          return
        }

        // Compute relative path from root
        const opts = state.opts || {}
        const rootDir = opts.rootDir || state.cwd || process.cwd()
        const relativeFilename = path.relative(rootDir, filename)

        const { column, line } = node.loc.start
        const value = formatComponentPathValue(relativeFilename, line, column)

        node.attributes.push(
          t.jsxAttribute(t.jsxIdentifier(componentPathAttributeName), t.stringLiteral(value))
        )
      }
    }
  }
}

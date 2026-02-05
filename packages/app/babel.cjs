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
// CHANGE: provide CommonJS entry point for Babel plugin with configurable attributeName.
// WHY: Babel configuration often requires CommonJS modules; support custom attribute names.
// REF: issue-12, issue-14
// FORMAT THEOREM: forall require: require(babel.cjs) -> PluginFactory
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: exports match Babel plugin signature
// COMPLEXITY: O(1)/O(1)

const path = require("node:path")

const componentPathAttributeName = "data-path"
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

        // Compute relative path from root and get attribute name
        const opts = state.opts || {}
        const rootDir = opts.rootDir || state.cwd || process.cwd()
        const attributeName = opts.attributeName || componentPathAttributeName
        const relativeFilename = path.relative(rootDir, filename)

        // Skip if already has the specified attribute (idempotency)
        if (attrExists(node, attributeName, t)) {
          return
        }

        const { column, line } = node.loc.start
        const value = formatComponentPathValue(relativeFilename, line, column)

        node.attributes.push(
          t.jsxAttribute(t.jsxIdentifier(attributeName), t.stringLiteral(value))
        )
      }
    }
  }
}

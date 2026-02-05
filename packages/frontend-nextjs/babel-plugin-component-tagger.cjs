/**
 * Babel plugin for tagging JSX elements with component path.
 *
 * @returns Babel plugin object
 *
 * @pure false
 * @effect Babel AST transformation
 * @invariant JSX elements are tagged with path attribute
 * @complexity O(n) where n = number of JSX elements
 */
// CHANGE: create standalone Babel plugin for Next.js.
// WHY: Next.js requires a standard Babel plugin format.
// QUOTE(TZ): "Создай новый проект типо packages/frontend только создай его для nextjs"
// REF: issue-12
// SOURCE: https://babeljs.io/docs/babel-plugin-transform-react-jsx
// FORMAT THEOREM: forall jsx: transform(jsx) -> tagged(jsx)
// PURITY: SHELL
// EFFECT: Babel AST mutation
// INVARIANT: each JSX opening element has at most one path attribute
// COMPLEXITY: O(n)/O(1)

const path = require("node:path")

const componentPathAttributeName = "path"

const jsxFilePattern = /\.(tsx|jsx)$/u

/**
 * Checks whether the filename represents a JSX or TSX module.
 *
 * @param filename - File path to check.
 * @returns true when the filename ends with .jsx/.tsx.
 *
 * @pure true
 * @invariant isJsxFile(filename) = true -> filename matches /\.(tsx|jsx)$/u
 * @complexity O(n) time / O(1) space where n = |filename|
 */
const isJsxFile = (filename) => jsxFilePattern.test(filename)

/**
 * Formats the component path payload containing file, line, and column.
 *
 * @param relativeFilename - Path relative to the project root.
 * @param line - 1-based line number from the parser location.
 * @param column - 0-based column number from the parser location.
 * @returns Encoded location string: "<path>:<line>:<column>".
 *
 * @pure true
 * @invariant line >= 1 and column >= 0
 * @complexity O(1) time / O(1) space
 */
const formatComponentPathValue = (relativeFilename, line, column) =>
  `${relativeFilename}:${line}:${column}`

/**
 * Checks if an attribute with the given name already exists on a JSX element.
 *
 * @param node - JSX opening element node.
 * @param attrName - Attribute name to check.
 * @param t - Babel types module.
 * @returns true if attribute exists.
 *
 * @pure true
 * @complexity O(n) where n = number of attributes
 */
const attrExists = (node, attrName, t) =>
  node.attributes.some(
    (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: attrName })
  )

module.exports = function componentTaggerPlugin({ types: t }) {
  return {
    name: "component-path-babel-tagger",
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const { node } = nodePath
        const filename = state.filename

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

        // Compute relative path from project root
        const rootDir = state.cwd || process.cwd()
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

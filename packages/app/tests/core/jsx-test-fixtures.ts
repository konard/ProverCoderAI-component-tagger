import type { types as t } from "@babel/core"

import type { JsxTaggerContext } from "../../src/core/jsx-tagger.js"

// CHANGE: extract common test fixtures to reduce code duplication
// WHY: vibecode-linter detects duplicates in test setup code
// REF: issue-25 test implementation
// PURITY: CORE (pure test data factories)
// INVARIANT: factories produce deterministic test nodes
// COMPLEXITY: O(1) per factory call

/**
 * Creates a test context for JSX tagger tests.
 *
 * @pure true
 * @complexity O(1)
 */
export const createTestContext = (
  filename = "src/App.tsx",
  attributeName = "data-path",
  options?: { tagComponents?: boolean }
): JsxTaggerContext => ({
  relativeFilename: filename,
  attributeName,
  ...(options !== undefined && { options })
})

/**
 * Creates a mock SourceLocation for testing.
 *
 * @pure true
 * @complexity O(1)
 */
export const createMockLocation = (
  line = 10,
  column = 5
): t.SourceLocation => ({
  start: { line, column, index: 0 },
  end: { line, column: column + 5, index: 0 },
  filename: "src/App.tsx",
  identifierName: undefined
})

/**
 * Creates a JSX opening element with className attribute for testing.
 *
 * @pure true
 * @complexity O(1)
 */
export const createNodeWithClassName = (
  types: typeof t,
  className = "container"
): t.JSXOpeningElement => {
  const node = types.jsxOpeningElement(types.jsxIdentifier("div"), [
    types.jsxAttribute(types.jsxIdentifier("className"), types.stringLiteral(className))
  ])
  return node
}

/**
 * Creates an empty JSX opening element for testing.
 *
 * @pure true
 * @complexity O(1)
 */
export const createEmptyNode = (types: typeof t): t.JSXOpeningElement =>
  types.jsxOpeningElement(types.jsxIdentifier("div"), [])

/**
 * Creates an empty JSX opening element with location info for testing.
 * Combines node creation and location setup to reduce duplication.
 *
 * @pure true
 * @complexity O(1)
 */
export const createEmptyNodeWithLocation = (
  types: typeof t,
  line = 10,
  column = 5
): t.JSXOpeningElement => {
  const node = createEmptyNode(types)
  node.loc = createMockLocation(line, column)
  return node
}

/**
 * Creates a JSX opening element with className attribute and location info for testing.
 * Combines node creation and location setup to reduce duplication.
 *
 * @pure true
 * @complexity O(1)
 */
export const createNodeWithClassNameAndLocation = (
  types: typeof t,
  className = "container",
  line = 15,
  column = 2
): t.JSXOpeningElement => {
  const node = createNodeWithClassName(types, className)
  node.loc = createMockLocation(line, column)
  return node
}

/**
 * Creates a simple JSX opening element without attributes for testing.
 *
 * @pure true
 * @complexity O(1)
 */
export const createJsxElement = (types: typeof t, name: string): t.JSXOpeningElement => {
  return types.jsxOpeningElement(types.jsxIdentifier(name), [], false)
}

/**
 * Creates a JSX element with location info for testing.
 *
 * @pure true
 * @complexity O(1)
 */
export const createJsxElementWithLocation = (
  types: typeof t,
  name: string,
  line: number,
  column: number
): t.JSXOpeningElement => {
  const element = types.jsxOpeningElement(types.jsxIdentifier(name), [], false)
  element.loc = {
    start: { line, column, index: 0 },
    end: { line, column: column + name.length, index: 0 },
    filename: "test.tsx",
    identifierName: name
  }
  return element
}

/**
 * Creates a JSX namespaced element for testing (e.g., svg:path).
 *
 * @pure true
 * @complexity O(1)
 */
export const createNamespacedElement = (
  types: typeof t,
  namespace: string,
  name: string
): t.JSXOpeningElement => {
  return types.jsxOpeningElement(
    types.jsxNamespacedName(types.jsxIdentifier(namespace), types.jsxIdentifier(name)),
    [],
    false
  )
}

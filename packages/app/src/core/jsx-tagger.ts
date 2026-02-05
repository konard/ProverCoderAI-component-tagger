import type { types as t, Visitor } from "@babel/core"

import { formatComponentPathValue, isHtmlTag } from "./component-path.js"

/**
 * Configuration options for JSX tagging behavior.
 *
 * @pure true
 */
// CHANGE: add configuration type for tagging scope control.
// WHY: enable flexible choice between DOM-only tagging vs all JSX elements.
// QUOTE(TZ): "Если нужно гибко — добавить опцию tagComponents?: boolean (default на твоё усмотрение)."
// REF: issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: ∀ config ∈ JsxTaggerOptions: config.tagComponents ∈ {true, false, undefined}
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: configuration is immutable
// COMPLEXITY: O(1)/O(1)
export type JsxTaggerOptions = {
  /**
   * Whether to tag React Components (PascalCase elements) in addition to HTML tags.
   * - true: Tag both HTML tags (<div>) and React Components (<MyComponent>)
   * - false: Tag only HTML tags (<div>), skip React Components (<MyComponent>)
   * - undefined/not provided: Defaults to true (tag everything)
   *
   * @default true
   */
  readonly tagComponents?: boolean | undefined
}

/**
 * Context required for JSX tagging.
 *
 * @pure true
 */
export type JsxTaggerContext = {
  /**
   * Relative file path from the project root.
   */
  readonly relativeFilename: string
  /**
   * Name of the attribute to add (defaults to "data-path").
   */
  readonly attributeName: string
  /**
   * Configuration options for tagging behavior.
   */
  readonly options?: JsxTaggerOptions | undefined
}

/**
 * Checks if a JSX attribute with the given name already exists on the element.
 *
 * @param node - JSX opening element to check.
 * @param attrName - Name of the attribute to look for.
 * @returns true if attribute exists, false otherwise.
 *
 * @pure true
 * @invariant returns true iff attribute with exact name exists
 * @complexity O(n) where n = number of attributes
 */
// CHANGE: extract attribute existence check as a pure utility.
// WHY: enable reuse across Vite and Babel plugin implementations.
// REF: issue-12 (unified interface request)
// FORMAT THEOREM: ∀ node, name: attrExists(node, name) ↔ ∃ attr ∈ node.attributes: attr.name = name
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: predicate is deterministic for fixed inputs
// COMPLEXITY: O(n)/O(1)
export const attrExists = (node: t.JSXOpeningElement, attrName: string, types: typeof t): boolean =>
  node.attributes.some(
    (attr) => types.isJSXAttribute(attr) && types.isJSXIdentifier(attr.name, { name: attrName })
  )

/**
 * Determines whether a JSX element should be tagged based on configuration.
 *
 * @param node - JSX opening element to check.
 * @param options - Tagging configuration options.
 * @param types - Babel types module.
 * @returns true if element should be tagged, false otherwise.
 *
 * @pure true
 * @invariant HTML tags are always tagged regardless of options
 * @invariant React Components are tagged only when tagComponents !== false
 * @complexity O(1)
 */
// CHANGE: add pure predicate for tagging eligibility.
// WHY: implement configurable tagging scope as per issue requirements.
// QUOTE(TZ): "Определиться: метить только lowercase-теги (div, h1) или вообще всё (MyComponent, Route тоже)."
// QUOTE(TZ): "(МЕтить надо всё)" - default should tag everything
// REF: issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: ∀ elem ∈ JSX: shouldTagElement(elem, opts) = isHtml(elem) ∨ (opts.tagComponents ≠ false)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: ∀ html ∈ HTML: shouldTagElement(html, _) = true
// INVARIANT: ∀ comp ∈ Component: shouldTagElement(comp, {tagComponents: false}) = false
// INVARIANT: ∀ comp ∈ Component: shouldTagElement(comp, {tagComponents: true}) = true
// COMPLEXITY: O(1)/O(1)
export const shouldTagElement = (
  node: t.JSXOpeningElement,
  options: JsxTaggerOptions | undefined,
  types: typeof t
): boolean => {
  // Extract element name
  let elementName: string
  if (types.isJSXIdentifier(node.name)) {
    elementName = node.name.name
  } else if (types.isJSXMemberExpression(node.name)) {
    // For JSXMemberExpression like <Foo.Bar>, we don't tag (not a simple component)
    return false
  } else if (types.isJSXNamespacedName(node.name)) {
    // For JSXNamespacedName like <svg:path>, treat namespace as lowercase
    elementName = node.name.namespace.name
  } else {
    // Unknown node type, skip
    return false
  }

  // Always tag HTML elements (lowercase)
  if (isHtmlTag(elementName)) {
    return true
  }

  // For React Components (PascalCase), check tagComponents option
  // Default: true (tag everything, as per issue comment)
  const tagComponents = options?.tagComponents ?? true
  return tagComponents
}

/**
 * Creates a JSX attribute with the component path value.
 *
 * @param attributeName - Name of the attribute to create.
 * @param relativeFilename - Relative path to the file.
 * @param line - 1-based line number.
 * @param column - 0-based column number.
 * @param types - Babel types module.
 * @returns JSX attribute node with the path value.
 *
 * @pure true
 * @invariant attribute name matches the provided attributeName parameter
 * @complexity O(1)
 */
// CHANGE: add attributeName parameter for configurable attribute names.
// WHY: support customizable attribute names while maintaining default "data-path".
// REF: issue-14 (add attributeName option)
// FORMAT THEOREM: ∀ n, f, l, c: createPathAttribute(n, f, l, c) = JSXAttribute(n, f:l:c)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: output format is always path:line:column with configurable attribute name
// COMPLEXITY: O(1)/O(1)
export const createPathAttribute = (
  attributeName: string,
  relativeFilename: string,
  line: number,
  column: number,
  types: typeof t
): t.JSXAttribute => {
  const value = formatComponentPathValue(relativeFilename, line, column)
  return types.jsxAttribute(types.jsxIdentifier(attributeName), types.stringLiteral(value))
}

/**
 * Processes a single JSX opening element and adds path attribute if needed.
 *
 * This is the unified business logic for tagging JSX elements with source location.
 * Both the Vite plugin and standalone Babel plugin use this function.
 *
 * @param node - JSX opening element to process.
 * @param context - Tagging context with relative filename, attribute name, and options.
 * @param types - Babel types module.
 * @returns true if attribute was added, false if skipped.
 *
 * @pure false (mutates node)
 * @invariant each JSX element has at most one instance of the specified attribute after processing
 * @invariant HTML elements are always tagged when eligible
 * @invariant React Components are tagged based on options.tagComponents
 * @complexity O(n) where n = number of existing attributes
 */
// CHANGE: extract unified JSX element processing logic with configurable scope and attribute name.
// WHY: satisfy user request for single business logic shared by Vite and Babel + configurable tagging + custom attribute names.
// QUOTE(TZ): "А ты можешь сделать что бы бизнес логика оставалось одной? Ну типо переиспользуй код с vite версии на babel"
// QUOTE(TZ): "Если нужно гибко — добавить опцию tagComponents?: boolean (default на твоё усмотрение)."
// REF: issue-12-comment (unified interface request), issue-14 (attributeName option), issue-23 (configurable scope)
// FORMAT THEOREM: ∀ jsx ∈ JSXOpeningElement: processElement(jsx, ctx) → (shouldTag(jsx, ctx.options) ∧ tagged(jsx)) ∨ skipped(jsx)
// PURITY: SHELL (mutates AST)
// EFFECT: AST mutation
// INVARIANT: idempotent - processing same element twice produces same result
// COMPLEXITY: O(n)/O(1)
export const processJsxElement = (
  node: t.JSXOpeningElement,
  context: JsxTaggerContext,
  types: typeof t
): boolean => {
  // Skip if no location info
  if (node.loc === null || node.loc === undefined) {
    return false
  }

  // Skip if already has the specified attribute (idempotency)
  if (attrExists(node, context.attributeName, types)) {
    return false
  }

  // Skip if element should not be tagged based on configuration
  if (!shouldTagElement(node, context.options, types)) {
    return false
  }

  const { column, line } = node.loc.start
  const attr = createPathAttribute(context.attributeName, context.relativeFilename, line, column, types)

  node.attributes.push(attr)
  return true
}

/**
 * Creates a Babel visitor for JSX elements that uses the unified tagging logic.
 *
 * This is the shared visitor factory used by both:
 * - Vite plugin (componentTagger) - passes relative filename directly
 * - Standalone Babel plugin - computes relative filename from state
 *
 * @param getContext - Function to extract context from Babel state.
 * @param types - Babel types module.
 * @returns Babel visitor object for JSXOpeningElement.
 *
 * @pure true (returns immutable visitor object)
 * @invariant visitor applies processJsxElement to all JSX opening elements
 * @complexity O(1) for visitor creation
 */
// CHANGE: create shared visitor factory for both plugin types.
// WHY: single unified interface as requested by user.
// QUOTE(TZ): "Сделай единный интерфейс для этого"
// REF: issue-12-comment (unified interface request)
// FORMAT THEOREM: ∀ visitor = createVisitor(ctx): visitor processes all JSX elements uniformly
// PURITY: CORE
// EFFECT: n/a (visitor application has effects)
// INVARIANT: visitor behavior is consistent across plugin implementations
// COMPLEXITY: O(1)/O(1)
export const createJsxTaggerVisitor = <TState>(
  getContext: (state: TState) => JsxTaggerContext | null,
  types: typeof t
): Visitor<TState> => ({
  JSXOpeningElement(nodePath, state) {
    const context = getContext(state)
    if (context === null) {
      return
    }
    processJsxElement(nodePath.node, context, types)
  }
})

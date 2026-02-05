import { types as t } from "@babel/core"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import { attrExists, createPathAttribute, type JsxTaggerContext, processJsxElement, shouldTagElement } from "../../src/core/jsx-tagger.js"
import {
  createEmptyNodeWithLocation,
  createNodeWithClassName,
  createNodeWithClassNameAndLocation
} from "./jsx-test-fixtures.js"

// CHANGE: add comprehensive unit tests for jsx-tagger core functions
// WHY: ensure mathematical invariants and idempotency properties are verified
// QUOTE(ТЗ): "Unit: formatComponentPathValue, attrExists, processJsxElement (идемпотентность, пропуск без loc)"
// REF: issue-25
// FORMAT THEOREM: ∀ test ∈ Tests: test verifies declared invariant
// PURITY: tests verify CORE purity and SHELL effects
// INVARIANT: tests catch regressions in attribute handling and format
// COMPLEXITY: O(1) per test case

// CHANGE: extract context factory to module scope per linter requirement
// WHY: unicorn/consistent-function-scoping rule enforces scope consistency
// REF: ESLint unicorn plugin rules
const createTestContext = (filename = "src/App.tsx", attributeName = "data-path", options?: { tagComponents?: boolean }): JsxTaggerContext => ({
  relativeFilename: filename,
  attributeName,
  ...(options !== undefined && { options })
})

// CHANGE: add helper for creating JSX elements for shouldTagElement tests
// WHY: reduce duplication in configurable tagging tests
// PURITY: CORE
// INVARIANT: creates consistent test elements
// COMPLEXITY: O(1)/O(1)
const createJsxElement = (name: string): t.JSXOpeningElement => {
  return t.jsxOpeningElement(t.jsxIdentifier(name), [], false)
}

const createJsxElementWithLocation = (name: string, line: number, column: number): t.JSXOpeningElement => {
  const element = t.jsxOpeningElement(t.jsxIdentifier(name), [], false)
  element.loc = {
    start: { line, column, index: 0 },
    end: { line, column: column + name.length, index: 0 },
    filename: "test.tsx",
    identifierName: name
  }
  return element
}

const createNamespacedElement = (namespace: string, name: string): t.JSXOpeningElement => {
  return t.jsxOpeningElement(
    t.jsxNamespacedName(t.jsxIdentifier(namespace), t.jsxIdentifier(name)),
    [],
    false
  )
}

describe("jsx-tagger", () => {
  describe("attrExists", () => {
    // FORMAT THEOREM: ∀ node, name: attrExists(node, name) ↔ ∃ attr ∈ node.attributes: attr.name = name
    // INVARIANT: predicate returns true iff attribute with exact name exists
    // COMPLEXITY: O(n) where n = number of attributes

    it.effect("returns false when element has no attributes", () =>
      Effect.sync(() => {
        const node = t.jsxOpeningElement(t.jsxIdentifier("div"), [])
        expect(attrExists(node, "data-path", t)).toBe(false)
      }))

    it.effect("returns false when attribute does not exist", () =>
      Effect.sync(() => {
        const node = createNodeWithClassName(t)
        expect(attrExists(node, "data-path", t)).toBe(false)
      }))

    it.effect("returns true when attribute exists", () =>
      Effect.sync(() => {
        const node = t.jsxOpeningElement(t.jsxIdentifier("div"), [
          t.jsxAttribute(t.jsxIdentifier("data-path"), t.stringLiteral("src/App.tsx:10:5"))
        ])
        expect(attrExists(node, "data-path", t)).toBe(true)
      }))

    it.effect("returns true when attribute exists among multiple attributes", () =>
      Effect.sync(() => {
        const node = t.jsxOpeningElement(t.jsxIdentifier("div"), [
          t.jsxAttribute(t.jsxIdentifier("className"), t.stringLiteral("container")),
          t.jsxAttribute(t.jsxIdentifier("data-path"), t.stringLiteral("src/App.tsx:10:5")),
          t.jsxAttribute(t.jsxIdentifier("id"), t.stringLiteral("main"))
        ])
        expect(attrExists(node, "data-path", t)).toBe(true)
      }))

    it.effect("returns false for spread attributes", () =>
      Effect.sync(() => {
        const spreadAttr = t.jsxSpreadAttribute(t.identifier("props"))
        const node = t.jsxOpeningElement(t.jsxIdentifier("div"), [spreadAttr])
        expect(attrExists(node, "data-path", t)).toBe(false)
      }))

    it.effect("distinguishes between different attribute names", () =>
      Effect.sync(() => {
        const node = t.jsxOpeningElement(t.jsxIdentifier("div"), [
          t.jsxAttribute(t.jsxIdentifier("data-path"), t.stringLiteral("value"))
        ])
        expect(attrExists(node, "path", t)).toBe(false)
        expect(attrExists(node, "data-path", t)).toBe(true)
      }))
  })

  describe("createPathAttribute", () => {
    // FORMAT THEOREM: ∀ f, l, c: createPathAttribute(f, l, c) = JSXAttribute(path, f:l:c)
    // INVARIANT: output format is always path:line:column
    // COMPLEXITY: O(1)/O(1)

    it.effect("creates JSX attribute with correct format", () =>
      Effect.sync(() => {
        const attr = createPathAttribute("data-path", "src/App.tsx", 10, 5, t)

        expect(t.isJSXAttribute(attr)).toBe(true)
        expect(t.isJSXIdentifier(attr.name)).toBe(true)
        expect(attr.name.name).toBe("data-path")
        expect(t.isStringLiteral(attr.value)).toBe(true)
        if (t.isStringLiteral(attr.value)) {
          expect(attr.value.value).toBe("src/App.tsx:10:5")
        }
      }))

    it.effect("handles nested directory paths", () =>
      Effect.sync(() => {
        const attr = createPathAttribute("data-path", "src/components/ui/Button.tsx", 42, 8, t)

        if (t.isStringLiteral(attr.value)) {
          expect(attr.value.value).toBe("src/components/ui/Button.tsx:42:8")
        }
      }))

    it.effect("handles line 1 and column 0", () =>
      Effect.sync(() => {
        const attr = createPathAttribute("data-path", "index.tsx", 1, 0, t)

        if (t.isStringLiteral(attr.value)) {
          expect(attr.value.value).toBe("index.tsx:1:0")
        }
      }))

    it.effect("handles large line and column numbers", () =>
      Effect.sync(() => {
        const attr = createPathAttribute("data-path", "src/LargeFile.tsx", 9999, 999, t)

        if (t.isStringLiteral(attr.value)) {
          expect(attr.value.value).toBe("src/LargeFile.tsx:9999:999")
        }
      }))
  })

  describe("shouldTagElement", () => {
    // CHANGE: add comprehensive tests for tagComponents configuration.
    // WHY: ensure correct behavior for DOM-only vs all JSX tagging modes.
    // QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
    // REF: issue-23
    // SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
    // FORMAT THEOREM: ∀ elem, opts: shouldTagElement(elem, opts) satisfies configurable tagging invariants
    // PURITY: CORE (tests pure functions)
    // EFFECT: n/a
    // INVARIANT: tests verify mathematical properties of tagging predicates
    // COMPLEXITY: O(1) per test

    describe("HTML tags (lowercase)", () => {
      it.effect("always tags HTML elements regardless of options", () =>
        Effect.sync(() => {
          const divElement = createJsxElement("div")
          const h1Element = createJsxElement("h1")

          // With tagComponents: true
          expect(shouldTagElement(divElement, { tagComponents: true }, t)).toBe(true)
          expect(shouldTagElement(h1Element, { tagComponents: true }, t)).toBe(true)

          // With tagComponents: false
          expect(shouldTagElement(divElement, { tagComponents: false }, t)).toBe(true)
          expect(shouldTagElement(h1Element, { tagComponents: false }, t)).toBe(true)

          // With undefined options (default behavior)
          expect(shouldTagElement(divElement, undefined, t)).toBe(true)
          expect(shouldTagElement(h1Element, undefined, t)).toBe(true)

          // With empty options object
          expect(shouldTagElement(divElement, {}, t)).toBe(true)
          expect(shouldTagElement(h1Element, {}, t)).toBe(true)
        }))
    })

    describe("React Components (PascalCase)", () => {
      it.effect("tags Components when tagComponents is true", () =>
        Effect.sync(() => {
          const myComponent = createJsxElement("MyComponent")
          const route = createJsxElement("Route")

          expect(shouldTagElement(myComponent, { tagComponents: true }, t)).toBe(true)
          expect(shouldTagElement(route, { tagComponents: true }, t)).toBe(true)
        }))

      it.effect("skips Components when tagComponents is false", () =>
        Effect.sync(() => {
          const myComponent = createJsxElement("MyComponent")
          const route = createJsxElement("Route")

          expect(shouldTagElement(myComponent, { tagComponents: false }, t)).toBe(false)
          expect(shouldTagElement(route, { tagComponents: false }, t)).toBe(false)
        }))

      it.effect("tags Components by default (undefined options)", () =>
        Effect.sync(() => {
          const myComponent = createJsxElement("MyComponent")
          const route = createJsxElement("Route")

          // Default behavior: tag everything
          expect(shouldTagElement(myComponent, undefined, t)).toBe(true)
          expect(shouldTagElement(route, undefined, t)).toBe(true)
        }))

      it.effect("tags Components by default (empty options object)", () =>
        Effect.sync(() => {
          const myComponent = createJsxElement("MyComponent")
          const route = createJsxElement("Route")

          expect(shouldTagElement(myComponent, {}, t)).toBe(true)
          expect(shouldTagElement(route, {}, t)).toBe(true)
        }))
    })

    describe("JSXMemberExpression (e.g., Foo.Bar)", () => {
      it.effect("skips JSXMemberExpression elements", () =>
        Effect.sync(() => {
          const memberExpr = t.jsxOpeningElement(
            t.jsxMemberExpression(t.jsxIdentifier("Foo"), t.jsxIdentifier("Bar")),
            [],
            false
          )

          expect(shouldTagElement(memberExpr, { tagComponents: true }, t)).toBe(false)
          expect(shouldTagElement(memberExpr, { tagComponents: false }, t)).toBe(false)
        }))
    })

    describe("JSXNamespacedName (e.g., svg:path)", () => {
      it.effect("tags namespaced elements based on namespace name", () =>
        Effect.sync(() => {
          // svg:path - namespace is lowercase "svg"
          const namespacedElement = createNamespacedElement("svg", "path")

          expect(shouldTagElement(namespacedElement, { tagComponents: true }, t)).toBe(true)
          expect(shouldTagElement(namespacedElement, { tagComponents: false }, t)).toBe(true)
        }))

      it.effect("skips namespaced elements with uppercase namespace", () =>
        Effect.sync(() => {
          // Custom:Element - namespace is uppercase "Custom"
          const namespacedElement = createNamespacedElement("Custom", "Element")

          expect(shouldTagElement(namespacedElement, { tagComponents: true }, t)).toBe(true)
          expect(shouldTagElement(namespacedElement, { tagComponents: false }, t)).toBe(false)
        }))
    })
  })

  describe("processJsxElement", () => {
    // FORMAT THEOREM: ∀ jsx ∈ JSXOpeningElement: processElement(jsx) → tagged(jsx) ∨ skipped(jsx)
    // INVARIANT: idempotent - processing same element twice produces same result
    // INVARIANT: each JSX element has at most one path attribute after processing
    // COMPLEXITY: O(n)/O(1) where n = number of existing attributes

    it.effect("adds path attribute when element has no attributes", () =>
      Effect.sync(() => {
        const node = createEmptyNodeWithLocation(t)
        const result = processJsxElement(node, createTestContext(), t)

        expect(result).toBe(true)
        expect(node.attributes.length).toBe(1)
        expect(attrExists(node, "data-path", t)).toBe(true)

        const pathAttr = node.attributes[0]
        if (t.isJSXAttribute(pathAttr) && t.isStringLiteral(pathAttr.value)) {
          expect(pathAttr.value.value).toBe("src/App.tsx:10:5")
        }
      }))

    it.effect("adds path attribute when element has other attributes", () =>
      Effect.sync(() => {
        const node = createNodeWithClassNameAndLocation(t)
        const result = processJsxElement(node, createTestContext(), t)

        expect(result).toBe(true)
        expect(node.attributes.length).toBe(2)
        expect(attrExists(node, "data-path", t)).toBe(true)
      }))

    it.effect("skips element without location info (loc === null)", () =>
      Effect.sync(() => {
        const node = t.jsxOpeningElement(t.jsxIdentifier("div"), [])
        node.loc = null

        const result = processJsxElement(node, createTestContext(), t)

        expect(result).toBe(false)
        expect(node.attributes.length).toBe(0)
        expect(attrExists(node, "data-path", t)).toBe(false)
      }))

    it.effect("skips element that already has path attribute (idempotency)", () =>
      Effect.sync(() => {
        const node = t.jsxOpeningElement(t.jsxIdentifier("div"), [
          t.jsxAttribute(t.jsxIdentifier("data-path"), t.stringLiteral("src/Old.tsx:5:0"))
        ])
        node.loc = {
          start: { line: 20, column: 3, index: 0 },
          end: { line: 20, column: 15, index: 0 },
          filename: "src/App.tsx",
          identifierName: undefined
        }

        const result = processJsxElement(node, createTestContext(), t)

        expect(result).toBe(false)
        expect(node.attributes.length).toBe(1) // No new attribute added
        const pathAttr = node.attributes[0]
        if (t.isJSXAttribute(pathAttr) && t.isStringLiteral(pathAttr.value)) {
          expect(pathAttr.value.value).toBe("src/Old.tsx:5:0") // Original value preserved
        }
      }))

    it.effect("is truly idempotent - processing twice produces same result", () =>
      Effect.sync(() => {
        const node = createEmptyNodeWithLocation(t)

        // First processing
        const result1 = processJsxElement(node, createTestContext(), t)
        expect(result1).toBe(true)
        const attributesAfterFirst = node.attributes.length

        // Second processing (should be no-op)
        const result2 = processJsxElement(node, createTestContext(), t)
        expect(result2).toBe(false)
        expect(node.attributes.length).toBe(attributesAfterFirst)
      }))

    it.effect("uses context filename for path value", () =>
      Effect.sync(() => {
        const node = t.jsxOpeningElement(t.jsxIdentifier("button"), [])
        node.loc = {
          start: { line: 7, column: 12, index: 0 },
          end: { line: 7, column: 20, index: 0 },
          filename: "different.tsx",
          identifierName: undefined
        }

        const context = createTestContext("src/components/Button.tsx")
        processJsxElement(node, context, t)

        const pathAttr = node.attributes.find(
          (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: "data-path" })
        )
        expect(pathAttr).toBeDefined()
        if (pathAttr && t.isJSXAttribute(pathAttr) && t.isStringLiteral(pathAttr.value)) {
          expect(pathAttr.value.value).toBe("src/components/Button.tsx:7:12")
        }
      }))

    it.effect("preserves existing attributes when adding path", () =>
      Effect.sync(() => {
        const node = t.jsxOpeningElement(t.jsxIdentifier("div"), [
          t.jsxAttribute(t.jsxIdentifier("className"), t.stringLiteral("container")),
          t.jsxAttribute(t.jsxIdentifier("id"), t.stringLiteral("main")),
          t.jsxSpreadAttribute(t.identifier("props"))
        ])
        node.loc = {
          start: { line: 25, column: 0, index: 0 },
          end: { line: 25, column: 30, index: 0 },
          filename: "src/App.tsx",
          identifierName: undefined
        }

        processJsxElement(node, createTestContext(), t)

        expect(node.attributes.length).toBe(4)
        // Verify original attributes still exist
        expect(attrExists(node, "className", t)).toBe(true)
        expect(attrExists(node, "id", t)).toBe(true)
        expect(attrExists(node, "data-path", t)).toBe(true)
      }))

    it.effect("tags HTML elements with default options", () =>
      Effect.sync(() => {
        const divElement = createJsxElementWithLocation("div", 1, 0)
        const context = createTestContext()

        const result = processJsxElement(divElement, context, t)

        expect(result).toBe(true)
        expect(divElement.attributes).toHaveLength(1)
        expect(t.isJSXAttribute(divElement.attributes[0])).toBe(true)
        const attr = divElement.attributes[0] as t.JSXAttribute
        expect(t.isJSXIdentifier(attr.name)).toBe(true)
        if (t.isJSXIdentifier(attr.name)) {
          expect(attr.name.name).toBe("data-path")
        }
        expect(t.isStringLiteral(attr.value)).toBe(true)
        if (t.isStringLiteral(attr.value)) {
          expect(attr.value.value).toBe("src/App.tsx:1:0")
        }
      }))

    it.effect("tags React Components with tagComponents: true", () =>
      Effect.sync(() => {
        const myComponent = createJsxElementWithLocation("MyComponent", 5, 2)
        const context = createTestContext("src/App.tsx", "data-path", { tagComponents: true })

        const result = processJsxElement(myComponent, context, t)
        expect(result).toBe(true)
        expect(myComponent.attributes).toHaveLength(1)
      }))

    it.effect("skips React Components with tagComponents: false", () =>
      Effect.sync(() => {
        const myComponent = createJsxElementWithLocation("MyComponent", 5, 2)
        const context = createTestContext("src/App.tsx", "data-path", { tagComponents: false })

        const result = processJsxElement(myComponent, context, t)
        expect(result).toBe(false)
        expect(myComponent.attributes).toHaveLength(0)
      }))

    it.effect("tags React Components by default (no options)", () =>
      Effect.sync(() => {
        const myComponent = createJsxElementWithLocation("Route", 10, 4)
        const context = createTestContext("src/Routes.tsx")

        const result = processJsxElement(myComponent, context, t)
        expect(result).toBe(true)
        expect(myComponent.attributes).toHaveLength(1)
      }))
  })
})

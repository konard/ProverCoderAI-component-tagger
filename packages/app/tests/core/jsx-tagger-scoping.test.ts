import { types as t } from "@babel/core"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import { processJsxElement, shouldTagElement } from "../../src/core/jsx-tagger.js"
import {
  createJsxElement,
  createJsxElementWithLocation,
  createNamespacedElement,
  createTestContext
} from "./jsx-test-fixtures.js"

// CHANGE: add comprehensive tests for tagComponents configuration in separate file.
// WHY: reduce file length to stay under 300-line limit while maintaining full test coverage.
// QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
// REF: issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: ∀ elem, opts: shouldTagElement(elem, opts) satisfies configurable tagging invariants
// PURITY: CORE (tests pure functions)
// EFFECT: n/a
// INVARIANT: tests verify mathematical properties of tagging predicates
// COMPLEXITY: O(1) per test

// Helper function for testing component tagging with different options
const testComponentTagging = (
  description: string,
  options: { tagComponents?: boolean } | undefined,
  expected: boolean
) => {
  it.effect(description, () =>
    Effect.sync(() => {
      const elements = [createJsxElement(t, "MyComponent"), createJsxElement(t, "Route")]
      for (const element of elements) {
        expect(shouldTagElement(element, options, t)).toBe(expected)
      }
    }))
}

// Helper function for testing processJsxElement integration
const testProcessing = (
  description: string,
  elementName: string,
  options: { tagComponents?: boolean } | undefined,
  expectedProcessed: boolean,
  expectedAttrCount: number
) => {
  it.effect(description, () =>
    Effect.sync(() => {
      const element = createJsxElementWithLocation(t, elementName, 5, 2)
      const context = createTestContext("src/App.tsx", "data-path", options)
      const result = processJsxElement(element, context, t)
      expect(result).toBe(expectedProcessed)
      expect(element.attributes).toHaveLength(expectedAttrCount)
    }))
}

describe("jsx-tagger: shouldTagElement scoping", () => {
  describe("HTML tags (lowercase)", () => {
    it.effect("always tags HTML elements regardless of options", () =>
      Effect.sync(() => {
        const divElement = createJsxElement(t, "div")
        const h1Element = createJsxElement(t, "h1")

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
    testComponentTagging("tags Components when tagComponents is true", { tagComponents: true }, true)
    testComponentTagging("skips Components when tagComponents is false", { tagComponents: false }, false)
    testComponentTagging("tags Components by default (undefined options)", undefined, true)
    testComponentTagging("tags Components by default (empty options object)", {}, true)
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
        const namespacedElement = createNamespacedElement(t, "svg", "path")

        expect(shouldTagElement(namespacedElement, { tagComponents: true }, t)).toBe(true)
        expect(shouldTagElement(namespacedElement, { tagComponents: false }, t)).toBe(true)
      }))

    it.effect("skips namespaced elements with uppercase namespace", () =>
      Effect.sync(() => {
        // Custom:Element - namespace is uppercase "Custom"
        const namespacedElement = createNamespacedElement(t, "Custom", "Element")

        expect(shouldTagElement(namespacedElement, { tagComponents: true }, t)).toBe(true)
        expect(shouldTagElement(namespacedElement, { tagComponents: false }, t)).toBe(false)
      }))
  })

  describe("processJsxElement integration with tagComponents", () => {
    testProcessing("tags HTML elements with default options", "div", undefined, true, 1)
    testProcessing("tags React Components with tagComponents: true", "MyComponent", { tagComponents: true }, true, 1)
    testProcessing(
      "skips React Components with tagComponents: false",
      "MyComponent",
      { tagComponents: false },
      false,
      0
    )
    testProcessing("tags React Components by default (no options)", "Route", undefined, true, 1)
  })
})

import { types as t } from "@babel/core"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import { attrExists, createPathAttribute, type JsxTaggerContext, processJsxElement } from "../../src/core/jsx-tagger.js"
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
const createTestContext = (filename = "src/App.tsx", attributeName = "data-path"): JsxTaggerContext => ({
  relativeFilename: filename,
  attributeName
})

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
  })
})

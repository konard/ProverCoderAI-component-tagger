import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import { componentPathAttributeName, formatComponentPathValue, isJsxFile } from "../../src/core/component-path.js"

describe("component-path", () => {
  it.effect("exposes the data-path attribute name", () =>
    Effect.sync(() => {
      expect(componentPathAttributeName).toBe("data-path")
    }))

  it.effect("formats the component path payload", () =>
    Effect.sync(() => {
      const result = formatComponentPathValue("src/App.tsx", 12, 3)
      expect(result).toBe("src/App.tsx:12:3")
    }))

  it.effect("detects JSX/TSX module ids", () =>
    Effect.sync(() => {
      expect(isJsxFile("src/App.tsx")).toBe(true)
      expect(isJsxFile("src/App.jsx?import")).toBe(true)
      expect(isJsxFile("src/App.ts")).toBe(false)
    }))
})

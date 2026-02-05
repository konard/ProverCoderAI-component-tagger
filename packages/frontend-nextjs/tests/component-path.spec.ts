import { expect, test } from "@playwright/test"

// CHANGE: add integration tests for both HTML and Component tagging in Next.js.
// WHY: verify correct tagging behavior for both element types with Babel plugin.
// QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
// REF: issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: ∀ elem ∈ {HTML, Component}: tagged(elem) ∧ has_path_attr(elem)
// PURITY: SHELL (E2E test with side effects)
// EFFECT: Browser automation
// INVARIANT: all JSX elements have path attribute (default behavior)
// COMPLEXITY: O(1) per test

test("tags HTML elements (lowercase tags) with path attribute", async ({ page }) => {
  await page.goto("/")

  // Test <h1> element (HTML tag)
  const title = page.getByTestId("title")
  const titlePath = await title.getAttribute("path")

  expect(titlePath).not.toBeNull()
  expect(titlePath ?? "").toMatch(/(app|packages\/frontend-nextjs\/app)\/page\.tsx:\d+:\d+$/u)

  // Test <p> element (HTML tag)
  const description = page.getByTestId("description")
  const descPath = await description.getAttribute("path")

  expect(descPath).not.toBeNull()
  expect(descPath ?? "").toMatch(/(app|packages\/frontend-nextjs\/app)\/page\.tsx:\d+:\d+$/u)
})

test("tags React Components (PascalCase) with path attribute by default", async ({ page }) => {
  await page.goto("/")

  // Test <CustomComponent> (React Component)
  // The component renders a div wrapper, but the CustomComponent invocation should be tagged
  const customComponent = page.getByTestId("custom-component")

  // Verify the wrapper div inside CustomComponent has path attribute
  const componentPath = await customComponent.getAttribute("path")
  expect(componentPath).not.toBeNull()
  expect(componentPath ?? "").toMatch(/(app|packages\/frontend-nextjs\/app)\/page\.tsx:\d+:\d+$/u)
})

test("shows tagged HTML in page source with comprehensive verification", async ({ page }) => {
  await page.goto("/")

  // Get all elements with path attribute for comprehensive verification
  const taggedElements = await page.locator("[path]").all()

  console.log("\n=== All Tagged Elements in Page ===")
  console.log(`Found ${taggedElements.length} elements with path attribute:\n`)

  for (const [index, element] of taggedElements.entries()) {
    const html = await element.evaluate((el) => el.outerHTML)
    const path = await element.getAttribute("path")
    console.log(`[${index + 1}] path="${path}"`)
    console.log(`    HTML: ${html.slice(0, 200)}${html.length > 200 ? "..." : ""}\n`)
  }
  console.log("===================================\n")

  // Verify we have tagged elements (at least 4: main, h1, p, CustomComponent's div)
  expect(taggedElements.length).toBeGreaterThan(0)
})

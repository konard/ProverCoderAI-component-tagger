import { expect, test } from "@playwright/test"

// CHANGE: add integration tests for both HTML and Component tagging with data-path attribute.
// WHY: verify correct tagging behavior for both element types with new attribute name.
// QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
// QUOTE(issue-14): "Rename attribute path → data-path (breaking change)"
// REF: issue-14, issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: ∀ elem ∈ {HTML, Component}: tagged(elem) ∧ has_data_path_attr(elem)
// PURITY: SHELL (E2E test with side effects)
// EFFECT: Browser automation
// INVARIANT: all JSX elements have data-path attribute (default behavior)
// COMPLEXITY: O(1) per test

test("tags HTML elements (lowercase tags) with data-path attribute", async ({ page }) => {
  await page.goto("/")

  // Test <h1> element (HTML tag)
  const title = page.getByTestId("title")
  const titlePath = await title.getAttribute("data-path")

  expect(titlePath).not.toBeNull()
  expect(titlePath ?? "").toMatch(/(src|packages\/frontend\/src)\/App\.tsx:\d+:\d+$/u)

  // Test <p> element (HTML tag)
  const description = page.getByTestId("description")
  const descPath = await description.getAttribute("data-path")

  expect(descPath).not.toBeNull()
  expect(descPath ?? "").toMatch(/(src|packages\/frontend\/src)\/App\.tsx:\d+:\d+$/u)
})

test("tags React Components (PascalCase) with data-path attribute by default", async ({ page }) => {
  await page.goto("/")

  // Test <CustomComponent> (React Component)
  // The component renders a div wrapper, but the CustomComponent invocation should be tagged
  const customComponent = page.getByTestId("custom-component")

  // Verify the wrapper div inside CustomComponent has data-path attribute
  const componentPath = await customComponent.getAttribute("data-path")
  expect(componentPath).not.toBeNull()
  expect(componentPath ?? "").toMatch(/(src|packages\/frontend\/src)\/App\.tsx:\d+:\d+$/u)
})

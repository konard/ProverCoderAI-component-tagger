import { expect, test } from "@playwright/test"

test("tags JSX with data-path", async ({ page }) => {
  await page.goto("/")

  const title = page.getByTestId("title")
  const value = await title.getAttribute("data-path")

  // Log the tagged element HTML for CI visibility
  const taggedHtml = await title.evaluate((el) => el.outerHTML)
  console.log("\n=== Component Tagger Result ===")
  console.log("Tagged element HTML:", taggedHtml)
  console.log("data-path attribute value:", value)
  console.log("===============================\n")

  expect(value).not.toBeNull()
  expect(value ?? "").toMatch(/(app|packages\/frontend-nextjs\/app)\/page\.tsx:\d+:\d+$/u)
})

test("shows tagged HTML in page source", async ({ page }) => {
  await page.goto("/")

  // Get all elements with data-path attribute for comprehensive verification
  const taggedElements = await page.locator("[data-path]").all()

  console.log("\n=== All Tagged Elements in Page ===")
  console.log(`Found ${taggedElements.length} elements with data-path attribute:\n`)

  for (const [index, element] of taggedElements.entries()) {
    const html = await element.evaluate((el) => el.outerHTML)
    const path = await element.getAttribute("data-path")
    console.log(`[${index + 1}] data-path="${path}"`)
    console.log(`    HTML: ${html.slice(0, 200)}${html.length > 200 ? "..." : ""}\n`)
  }
  console.log("===================================\n")

  // Verify we have tagged elements
  expect(taggedElements.length).toBeGreaterThan(0)
})

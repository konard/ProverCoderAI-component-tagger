import { expect, test } from "@playwright/test"

test("tags JSX with path only", async ({ page }) => {
  await page.goto("/")

  const title = page.getByTestId("title")
  const value = await title.getAttribute("path")

  expect(value).not.toBeNull()
  expect(value ?? "").toMatch(/(app|packages\/frontend-nextjs\/app)\/page\.tsx:\d+:\d+$/u)

  // Only assert the presence of the single path attribute.
})

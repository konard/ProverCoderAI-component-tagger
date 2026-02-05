import { expect, test } from "@playwright/test"

test("tags JSX with data-path", async ({ page }) => {
  await page.goto("/")

  const title = page.getByTestId("title")
  const value = await title.getAttribute("data-path")

  expect(value).not.toBeNull()
  expect(value ?? "").toMatch(/(src|packages\/frontend\/src)\/App\.tsx:\d+:\d+$/u)

  // Only assert the presence of the single data-path attribute.
})

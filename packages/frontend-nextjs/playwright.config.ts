import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  webServer: {
    command: "pnpm exec next dev --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env["CI"]
  },
  use: {
    baseURL: "http://127.0.0.1:4174"
  }
})

import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	projects: [
		{ name: "web", testDir: "test", testMatch: ["**/e2e/*.test.ts"] },
		{
			name: "electron",
			testDir: "test",
			testMatch: ["electron/**/*.test.ts"],
			fullyParallel: false,
			workers: 1
		}
	],
	reporter: [
		["html", { open: process.env.CI === "true" ? "never" : "on-failure" }]
	],
	use: {
		...devices["Desktop Chrome"],
		baseURL: `http://localhost:${process.env.NUXT_PORT}`,
		screenshot: "only-on-failure",
		trace: "on",
		ignoreHTTPSErrors: true
	}
})

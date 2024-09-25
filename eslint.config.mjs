// @ts-check
import { vueConfig } from "@alanscodelog/eslint-config"
import { createConfigForNuxt } from "@nuxt/eslint-config/flat"

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
	features: {
		tooling: false, // is overriding standalone?
		stylistic: false,
		standalone: false
	},
	dirs: {
		src: [
			"./playground",
		],
	},
})
	.append(
		...vueConfig,
		{
			rules: {
				// for auto imports
				"no-undef": "off",
			}
		}
	)

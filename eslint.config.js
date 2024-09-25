import {
	nuxtModuleAppends,
	nuxtModuleConfig
} from "@alanscodelog/eslint-config"
import { createConfigForNuxt } from "@nuxt/eslint-config"
// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
	...nuxtModuleConfig
})
	.append([
		...nuxtModuleAppends,
		{
			rules: {
				"jsdoc/check-tag-names": ["warn", { definedTags: [
					"experimental"
				] }]
			}
		}
	])

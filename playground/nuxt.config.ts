import { pretty } from "@alanscodelog/utils/pretty"

export default defineNuxtConfig({
	modules: [
		"@witchcraft/ui",
		"@witchcraft/nuxt-logger",
		"../src/module.ts"
	],
	devtools: { enabled: true },
	routeRules: {
		"/spa": {
			ssr: false
			// can be prerender: false if you want, tested and it should work
		}
	},
	future: {
		compatibilityVersion: 4 as const
	},
	experimental: {
		debugModuleMutation: true
	},
	compatibilityDate: "2024-09-23",
	nitro: {
		output: {
			dir: ".dist/web/.output",
			serverDir: ".dist/web/.output/server",
			publicDir: ".dist/web/.output/public"
		},
		prerender: {
			// for debugging issues in the playground
			failOnError: false
		}
	},
	vite: {
		build: {
			// for debugging
			minify: false
		}
	},
	hooks: {
		"ready"(nuxt) {
			/* eslint-disable no-console */
			// debug issues with routes
			console.log("FINAL ROUTE RULES:")
			console.log(pretty((nuxt.options as any).routeRules))
			console.log("NITRO ROUTE RULES:")
			console.log(pretty((nuxt.options as any).nitro!.routeRules))
		}
	},
	electron: {
		additionalElectronVariables: {
			// this will hardcode `process.env.PUBLIC_SERVER_URL` to the server url in production
			// this means getPaths().publicServerUrl will always return your site url (see getPaths) unless you allow getPaths an override (see it for details)
			publicServerUrl: process.env.NODE_ENV === "production"
			// note the quotes for strings! this is a literal replacement that happens
			// you also cannot access process.env dynamically if you want this to work (e.g. process.env[name])
				? `"https://yoursite.com"`
				: `undefined`
		},
		electronBuildPackScript: "pnpm build:electron:pack",
		electronViteOptions: {
			build: {
				// prevent minification and stripping of console.log in production for the playground for easier debugging
				minify: false
			}
		},
		// the module will set this to pre-render
		additionalRoutes: ["/other-page-prerendered", "/spa"]
	}
})

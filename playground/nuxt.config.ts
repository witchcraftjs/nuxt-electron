export default defineNuxtConfig({
	modules: [
		"@witchcraft/ui",
		"@witchcraft/nuxt-logger",
		"../src/module.ts"
	],
	devtools: { enabled: true },
	future: {
		compatibilityVersion: 4 as const
	},
	compatibilityDate: "2024-09-23",
	nitro: {
		output: {
			dir: ".dist/web/.output",
			serverDir: ".dist/web/.output/server",
			publicDir: ".dist/web/.output/public"
		}
	},
	vite: {
		build: {
			// for debugging
			minify: false
		}
	},
	electron: {
		additionalElectronVariables: {
			publicServerUrl: process.env.NODE_ENV === "production"
				? `"https://yoursite.com"`
				: `undefined`
		},
		electronBuildPackScript: "pnpm build:electron:pack",
		electronViteOptions: {
			build: {
				// prevent minification and stripping of console.log in production for the playground for easier debugging
				minify: false
			}
		}
	}
})

export default defineNuxtConfig({
	devtools: { enabled: true },
	compatibilityDate: "2024-09-23",
	future: {
		compatibilityVersion: 4 as const
	},
	modules: [
		"@witchcraft/nuxt-logger",
		// the below also works, just remember to run the update-dep script and uncomment ../src/module above before attempting to use the file: linked module

		"../src/module.ts"
	],
	vite: {
		build: {
			// for debugging
			minify: false,
		}
	},
	electron: {
		additionalElectronVariables: {
			publicServerUrl: process.env.NODE_ENV === "production"
			// would be yoursite.com in production
			? `"localhost:3000"`
			: `undefined`,
		},
		electronBuildPackScript: "pnpm build:electron:pack",
		electronViteOptions: {
			build: {
				// prevent minification and stripping of console.log in production for the playground for easier debugging
				minify: false,
			},
		},
	}
})

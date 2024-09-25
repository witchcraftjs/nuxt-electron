export default defineNuxtConfig({
	devtools: { enabled: true },
	compatibilityDate: "2024-09-23",
	future: {
		compatibilityVersion: 4 as const
	},
	modules: [
		"@witchcraft/nuxt-logger",
		"@witchcraft/nuxt-electron",
	],
	vite: {
		build: {
			// for debugging
			minify: false,
		}
	},
	electron: {
		electronViteOptions: {
			build: {
				// prevent minification and stripping of console.log in production for the playground for easier debugging
				minify: false,
			},
		},
	}
})

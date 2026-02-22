import { crop } from "@alanscodelog/utils/crop"
import { run } from "@alanscodelog/utils/run"
import {
	addComponentsDir,
	addImportsDir,
	addTemplate,
	createResolver,
	defineNuxtModule,
	extendRouteRules,
	useLogger
} from "@nuxt/kit"
import { createConstantCaseVariables, nuxtRemoveUneededPages, nuxtRerouteOutputTo } from "@witchcraft/nuxt-utils/utils"
import { defu } from "defu"
import fs from "node:fs/promises"
import path from "node:path"
import type { ViteConfig } from "nuxt/schema"
import type { RollupOutput, RollupWatcher } from "rollup"
import type { ViteDevServer } from "vite"
import { build, type ElectronOptions, startup } from "vite-plugin-electron"
import { notBundle } from "vite-plugin-electron/plugin"
import { externalizeDeps } from "vite-plugin-externalize-deps"


// https://github.com/electron-vite/vite-plugin-electron/issues/251#issuecomment-2360153184
startup.exit = async () => {
	if ("electronApp" in process) {
		try {
			const app = process.electronApp as any
			app.removeAllListeners()
			process.kill(app.pid)
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error("Could not kill electron instance/s.")
			// eslint-disable-next-line no-console
			console.error(e)
		}
	}
}

export interface ModuleOptions {
	srcDir: string
	/**
	 * The dir for building for electron. `.output` and `build` will be put in here, and also release (but that's left up to your electron packing configuration).
	 *
	 * @default ".dist/electron/"
	 */
	electronBuildDir: string
	/**
	 * The nuxt output dir when not building electron.
	 *
	 * @default ".dist/web/.output"
	 */
	nonElectronNuxtBuildDir: string
	/**
	 * The main route of the electron app. Electron will be pointed to this route.
	 *
	 * @default "/app"
	 */
	electronRoute: string
	/**
	 * Additional routes to include in the electron build. Note that "/" is always included as not including it was causing issues.
	 */
	additionalRoutes: string[]
	/** Extra cli arguments to launch electron with in dev mode */
	extraCliArgs: string[]
	/**
	 * If set, adds `--dev-user-data-dir ${devUserDataDir}` to the cli arguments in development mode.
	 *
	 * You will then need to parse this in main.ts, a `useDevDataDir` function is provided for this. This does not do any advanced parsing, just takes the next argument after `--dev-user-data-dir` so the path must not contain spaces.
	 * ```ts
	 * const userDataDir = useDevDataDir() ?? app.getPath("userData")
	 *
	 * @default "~~/.user-data-dir"
	 */
	devUserDataDir: string | null
	/**
	 * The script to run to build/pack the electron app.
	 *
	 * @default "npm run build:electron:pack"
	 */
	electronBuildPackScript: string
	/** Whether to enable the module. */
	enable: boolean
	/**
	 * Whether to auto-open electron. If undefined, is controlled by the AUTO_OPEN env variable instead (it should include the word `electron` to enable autoOpen).
	 *
	 * This only works in dev mode.
	 *
	 * @default undefined
	 */
	autoOpen: boolean
	/**
	 * Pass public runtime config options only for electron.
	 */
	electronOnlyRuntimeConfig: Record<string, any>
	/**
	 * Whether you're using a preload script.
	 *
	 * @default true
	 */
	usePreloadScript: boolean
	/**
	 * Pass custom vite options to the electron vite builder (e.g. wasm()) as they are not copied over from nuxt's vite config.
	 *
	 * Note that `build.emptyOutDir` cannot be changed, it must be false for the reloading to work.
	 */
	// importing the type from vite is causing build issues :/
	electronViteOptions: ElectronOptions["vite"]
	notBundleOptions: Parameters<typeof notBundle>[0]
	/**
	 * Additional variables to "bake" into the electron build. Note these must be quoted if they are strings.
	 *
	 * You can set these as properties of STATIC, to make it clearer what they are.
	 *
	 * ```ts
	 * import { STATIC } from "@witchcraft/nuxt-electron/electron"
	 *
	 * // assuming electron.additionalElectronVariables.someVariable = `"some-var"`
	 *
	 * STATIC.SOME_VARIABLE = process.env.SOME_VARIABLE
	 *
	 * // becomes
	 * STATIC.SOME_VARIABLE = "some-var"
	 * ```
	 */
	additionalElectronVariables: Record<string, string>
	/**
	 * Additional vite defines to copy from the resolved vite config.
	 *
	 * The module copies the following defines from nuxt's vite config for the electron vite config:
	 *
	 * ```
	 * __NUXT_VERSION__
	 * process.dev
	 * import.meta.dev
	 * process.test
	 * import.meta.test
	 *```
	 * And the following are also added:
	 * ```
	 * import.meta.electron (true from main, false elsewhere)
	 * process.electron (true from main, false elsewhere)
	 * ```
	 *
	 * They will only be true for files that might be imported by main only. For renderer/client side use `isElectron()` instead. We cannot define them on the client side because during dev they would be wrong (electorn is always pointing to the same page as the server).
	 *
	 */
	additionalViteDefinesToCopy: string[]
}

export default defineNuxtModule<ModuleOptions>({
	meta: {
		name: "electron",
		configKey: "electron"
	},
	// Default configuration options of the Nuxt module
	defaults: {
		srcDir: "~~/app-electron",
		electronBuildDir: "~~/.dist/electron",
		nonElectronNuxtBuildDir: "~~/.dist/web/.output",
		devUserDataDir: undefined,
		electronRoute: "/app",
		autoOpen: process.env.AUTO_OPEN?.includes("electron"),
		electronBuildPackScript: "npm run build:electron:pack",
		additionalRoutes: [],
		extraCliArgs: [],
		enable: true,
		electronOnlyRuntimeConfig: {},
		usePreloadScript: true,
		electronViteOptions: {},
		additionalElectronVariables: {},
		additionalViteDefinesToCopy: [],
		notBundleOptions: {}
	},
	moduleDependencies: {
		"@witchcraft/ui/nuxt": {
			version: "^0.3.2"
		}
	},
	async setup(options, nuxt) {
		// if the user explicitly sets it to null we want it to stay null
		if (options.devUserDataDir === undefined) {
			options.devUserDataDir = "~~/.user-data-dir"
		}

		if (!options.enable) { return }
		const moduleName = "@witchcraft/nuxt-electron"
		const logger = useLogger(moduleName)
		const { resolvePath, resolve } = createResolver(import.meta.url)

		addComponentsDir({
			global: true,
			path: resolve("runtime/components")
		})

		addTemplate({
			filename: "witchcraft-electron.css",
			write: true,
			getContents: () => crop`
				@source "${resolve("runtime/components")}";
			`
		})

		const isDev = nuxt.options.dev
		const srcDir = await resolvePath(options.srcDir, nuxt.options.alias)
		const nonElectronNuxtBuildDir = await resolvePath(options.nonElectronNuxtBuildDir, nuxt.options.alias)

		// at this point they are made relative to the nuxt dir
		// for passing to electron we make them relative to main
		const electronRootBuildDir = await resolvePath(options.electronBuildDir, nuxt.options.alias)
		const relativeElectronDir = path.relative(nuxt.options.rootDir, electronRootBuildDir)
		// must be relative
		const electronNuxtDir = path.join(relativeElectronDir, ".output")
		// must be relative
		const electronBuildDir = path.join(relativeElectronDir, "build")
		const electronProdUrl = `${options.electronRoute}/index.html`
		const electronRoute = options.electronRoute

		const electronNuxtPublicDir = path.join(electronNuxtDir, "public")
		const mainScriptPath = path.join(srcDir, "main.ts")
		const preloadScriptPath = path.join(srcDir, "preload.ts")

		const hasMainScript = await fs.stat(mainScriptPath).then(() => true).catch(() => false)
		const hasPreloadScript = !options.usePreloadScript || await fs.stat(preloadScriptPath).then(() => true).catch(() => false)

		const hasScripts = hasMainScript && hasPreloadScript
		// also needed because during prepare for the module, they won't exist in the module dir
		if (!hasScripts) {
			logger.warn(`Missing electron scripts: ${[hasMainScript ? "" : "main.ts", hasPreloadScript ? "" : "preload.ts"].join(", ")}. Skipping electron build.`)
		}

		const isElectronBuild = process.env.BUILD_ELECTRON === "true" && hasScripts
		const skipElectronPack = !isElectronBuild || process.env.SKIP_ELECTRON_PACK === "true"

		const autoOpen = !!(options.autoOpen && hasScripts && isDev)
		const useWatch = nuxt.options.dev

		const devUserDataDir = options.devUserDataDir && await resolvePath(options.devUserDataDir, nuxt.options.alias)
		if (devUserDataDir) {
			if (!await fs.stat(devUserDataDir).then(() => true).catch(() => false)) {
				await fs.mkdir(devUserDataDir, {
					recursive: true
				})
			}
		}

		logger.debug({
			isDev,
			useWatch,
			srcDir,
			prodNonElectronNuxtDir: nonElectronNuxtBuildDir,
			electronRootBuildDir,
			relativeElectronDir,
			electronNuxtDir,
			electronBuildDir,
			electronProdUrl,
			electronRoute,
			electronNuxtPublicDir,
			mainScriptPath,
			preloadScriptPath,
			isElectronBuild,
			skipElectronPack,
			autoOpen,
			devUserDataDir
		})

		let resolveGetViteServer: (res: ViteDevServer) => void

		const viteServerPromise = new Promise<ViteDevServer>(resolve => {
			resolveGetViteServer = resolve
		})
		nuxt.hook("vite:serverCreated", server => {
			logger.info(`Resolved vite server.`)
			resolveGetViteServer(server as any)
		})

		const viteServerUrl = new Promise<string | undefined>(resolve => {
			nuxt.hook("build:before", () => {
				resolve(undefined)
			})
			nuxt.hook("listen", (_server, listener) => {
				logger.info(`Resolved server url.`, listener.url)
				// listener does not have a type! :/
				resolve(listener.url as string)
			})
		})

		const viteConfigPromise = new Promise<ViteConfig>(resolve => {
			nuxt.hook("vite:configResolved", config => {
				resolve(config)
			})
		})

		let maybeWatchers: (RollupWatcher | RollupOutput | RollupOutput[])[]
		let started = false

		nuxt.hook("vite:extendConfig", config => {
			// @ts-expect-error it's both readonly and possible undefined???
			config.define ??= {}
			config.define["import.meta.electron"] = "false"
			config.define["process.electron"] = "false"
		})

		const buildElectron = async () => {
			if (maybeWatchers || started) return

			started = true

			const viteConfig = await viteConfigPromise

			const electronRuntimeConfig = defu(
				options.electronOnlyRuntimeConfig,
				nuxt.options.runtimeConfig.public
			)
			const additionalElectronVariables = defu(
				options.additionalElectronVariables,
				(nuxt.options.electron === false ? {} : nuxt.options.electron.additionalElectronVariables)
			)
			const additionalViteDefinesToCopy = [
				...options.additionalViteDefinesToCopy,
				...(nuxt.options.electron === false ? [] : (nuxt.options.electron.additionalViteDefinesToCopy ?? []))
			]

			const copyFromVite = [
				"__NUXT_VERSION__",
				"process.dev",
				"import.meta.dev",
				"process.test",
				"import.meta.test",
				...additionalViteDefinesToCopy
			]

			// this is typed in app-electron/static.ts
			const electronVariables = {
				"process.electron": true,
				"import.meta.electron": true,
				...Object.fromEntries(
					copyFromVite.map(v => [v, viteConfig.define![v]])
				),
				...createConstantCaseVariables({
					// on windows the backslashes in the paths must be double escaped
					electronRoute: electronRoute.replaceAll("\\", "\\\\"),
					electronProdUrl: electronProdUrl.replaceAll("\\", "\\\\"),
					// all paths muxt be made relative to the build dir where electron will launch from in production
					electronNuxtDir: path.relative(electronBuildDir, relativeElectronDir).replaceAll("\\", "\\\\"),
					electronNuxtPublicDir: path.relative(electronBuildDir, electronNuxtPublicDir).replaceAll("\\", "\\\\"),
					electronBuildDir: path.relative(electronBuildDir, electronBuildDir).replaceAll("\\", "\\\\"),
					// ...options.additionalElectronVariables,
					// nuxt's runtimeConfig cannot be used in electron's main since it's built seperately
					// also we must stringify ourselves since escaped double quotes are not preserved in the final output :/
					electronRuntimeConfig: JSON.stringify(electronRuntimeConfig).replaceAll("\\", "\\\\")
				}, "process.env."), // wut am having issue with just using STATIC. directly ???
				...createConstantCaseVariables(
					additionalElectronVariables,
					"process.env.",
					{ autoquote: false }
				)
			}

			const electronViteOptions: ElectronOptions["vite"] = defu(
				{
					build: {
						// must be false or preload can get deleted when vite rebuilds
						emptyOutDir: false
					}
				},
				options.electronViteOptions,
				{
					build: {
						outDir: electronBuildDir,
						minify: false
					},
					define: electronVariables,
					resolve: {
						alias: nuxt.options.alias,
						extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".vue"]
					},
					plugins: [externalizeDeps() as any]
				})

			const electronCliArgs = [
				".",
				...(process.env.NODE_ENV !== "production"
					&& devUserDataDir
					? [
							"--dev-user-data-dir",
							devUserDataDir
						]
					: []),
				...(options.extraCliArgs ?? [])
			]

			const builds: ElectronOptions[] = [
				{
					entry: mainScriptPath,
					onStart: autoOpen
						? async () => {
							// vite-plugin-electron adds --no-electron to deal with dev server issues on some linux distros, but it's working for me and we don't want it
							// https://github.com/electron-vite/vite-plugin-electron/pull/57
							await startup([...electronCliArgs])
						}
						: undefined
				},
				...(
					options.usePreloadScript
						? [{
								entry: preloadScriptPath,
								onStart: async () => {
									(await viteServerPromise).hot.send({ type: "full-reload" })
								},
								build: {
									rollupOptions: {
										output: {
											inlineDynamicImports: true
										}
									}
								}
							}]
						: []
				)
			].map(entry => ({
				vite: {
					mode: process.env.NODE_ENV,
					...electronViteOptions,
					build: {
						watch: useWatch
							? {
									include: [`${srcDir}/**/*`]
								}
							: null,
						lib: {
							entry: entry.entry,
							formats: entry.entry.includes("preload") ? ["cjs"] : ["es"],
							fileName: () => entry.entry.includes("preload") ? "[name].cjs" : "[name].mjs"
						},
						...electronViteOptions.build
					},
					plugins: [
						autoOpen
							? {
									name: "plugin-start-electron",
									async closeBundle() {
										void entry.onStart?.()
									}
								}
							: undefined,
						// not bundle breaks preload because it tries to required from node_modules
						// and sandboxed windows can't do that
						...(!isElectronBuild && !entry.entry.includes("preload") ? [notBundle(options.notBundleOptions)] : []),
						...(electronViteOptions.plugins ?? [])
					]
				}
			}))

			logger.debug(builds)

			const devUrl = await viteServerUrl
			if (devUrl) {
				Object.assign(process.env, {
					VITE_DEV_SERVER_URL: devUrl.slice(0, -1)
				})
			}

			logger.debug({
				electronViteOptions,
				prodNonElectronNuxtDir: nonElectronNuxtBuildDir,
				electronVariables,
				electronRuntimeConfig,
				electronCliArgs,
				devUrl
			})

			maybeWatchers = (await Promise.all(builds.map(async config =>
				build(config)
					.then(res => {
						logger.info(`Build done.`)
						return res
					})
					.catch(err => {
						logger.error(`Build failed.`, err)
						process.exit(1)
					})
			)))

			if (useWatch) {
				for (const maybeWatcher of maybeWatchers) {
					if (maybeWatcher && "on" in maybeWatcher) {
						maybeWatcher.on("change", e => {
							logger.info(`Detected change in: ${e}`)
						})
					}
				}
			}
		}

		if (autoOpen) {
			nuxt.hook("close", async () => {
				logger.info(`Killing`)
				await startup?.exit()
			})

			nuxt.hook("restart", async () => {
				logger.info(`Killing and Restarting`)
				await startup?.exit()
			})
		}

		logger.info(`Building Electron: ${isElectronBuild}`)
		if (isElectronBuild) {
			// completely disable prefetching
			// https://github.com/nuxt/nuxt/issues/18376#issuecomment-1431318970
			nuxt.hook("build:manifest", manifest => {
				for (const key of Object.keys(manifest)) {
					manifest[key]!.dynamicImports = []
				}
			})

			// the "/" is not technically needed but only if we properly split the chunks by pages and that was causing issues
			nuxtRemoveUneededPages(nuxt, ["/", electronRoute, ...options.additionalRoutes!])

			nuxt.options.router.options ??= {}
			nuxt.options.router.options.hashMode = false

			extendRouteRules(electronRoute + "/**", {
				prerender: true
			}, { override: true })

			for (const route of options.additionalRoutes) {
				extendRouteRules(route, {
					prerender: true
				}, { override: true })
			}


			/* Nuxt in build mode won't generate this. And we need build mode so api calls aren't baked in. */
			nuxt.hook("prerender:routes", ({ routes }) => {
				for (const route of ["/404.html"]) {
					routes.add(route)
				}
			})


			nuxtRerouteOutputTo(nuxt, electronNuxtDir)

			// the build:done hook doesn't work as nitro seems to build after
			nuxt.hook("close", async () => {
				logger.info(`Building Electron`)
				await buildElectron()
				if (!skipElectronPack) {
					logger.info(`Packing Electron`)
					const buildCommand = run(options.electronBuildPackScript, {
						stdio: "inherit"
					})

					await buildCommand.promise
						.catch(err => { logger.error("Error building electron.", err); process.exit(1) })
				} else {
					logger.info(`Skipping Electron Pack`)
				}
				logger.info(`Done Building Electron`)
			})
		} else {
			if (isDev) {
				nuxt.hook("ready", async () => {
					logger.info("electron - ready")
					void buildElectron()
				})
				logger.info(`Watching Electron`)
			} else {
				logger.info(`Skipping Electron Build`)
			}
			const nuxtOutputDir = nuxt.options.nitro?.output?.dir
			if (nuxtOutputDir === undefined || nuxtOutputDir === ".output") {
				logger.warn(crop`Nitro output dir is not set or set to the default, it's suggested you set it to the following when using nuxt-electron:
					nitro: {
						output: ".dist/web/.output",
						serverDir: ".dist/web/.output/server"
						publicDir: ".dist/web/.output/public"
					}
				.`)
			}
		}

		addImportsDir(resolve("runtime/utils"))
	}
})

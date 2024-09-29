/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { run } from "@alanscodelog/utils/run.js"
import { addImportsDir, addRouteMiddleware, createResolver, defineNuxtModule, extendRouteRules, useLogger } from "@nuxt/kit"
import { createConstantCaseVariables , nuxtFileBasedRouting , nuxtRemoveUneededPages , nuxtRerouteOutputTo } from "@witchcraft/nuxt-utils/utils"
import defu from "defu"
import fs from "fs/promises"
import { type NuxtPage } from "nuxt/schema"
import path from "path"
import type { RollupOutput, RollupWatcher } from "rollup"
import { type ViteDevServer } from "vite"
import { build, type ElectronOptions, startup } from "vite-plugin-electron"
import { externalizeDeps } from "vite-plugin-externalize-deps"

// https://github.com/electron-vite/vite-plugin-electron/issues/251#issuecomment-2360153184
startup.exit = async () => {
	if ("electronApp" in process) {
		const app = process.electronApp as any
		app.removeAllListeners()
		process.kill(app.pid)
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
	 * If set, adds `--user-data-dir ${devUserDataDir}` to the cli arguments in development mode.
	 *
	 * You will then need to parse this in main.ts, a `useDevDataDir` function is provided for this. This does not do any advanced parsing, just takes the next argument after `--user-data-dir` so the path must not contain spaces.
	 * ```ts
	 * const userDataDir = useDevDataDir() ?? app.getPath("userData")
	 *
	 * @default "~~/.user-data-dir"
	 */
	devUserDataDir: string
	/**
	 * The script to run to build/pack the electron app.
	 *
	 * @default "npm run build:electron:pack"
	 */
	electronBuildPackScript: string
	debug: boolean
	/** Whether to enable the module. */
	enable: boolean
	/**
		* Whether to auto-open electron. If undefined, is controlled by the AUTO_OPEN env variable instead (it should include the word `electron` to enable autoOpen).
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
	 * Pass custom vite options to the electron vite builder.
	 *
	 * Note that `build.emptyOutDir` cannot be changed, it must be false for the reloading to work.
	 */
	// importing the type from vite is causing build issues :/
	electronViteOptions: ElectronOptions["vite"]
}

export default defineNuxtModule<ModuleOptions>({
	meta: {
		name: "electron",
		configKey: "electron",
	},
	// Default configuration options of the Nuxt module
	defaults: {
		srcDir: "~~/app-electron",
		electronBuildDir: "~~/.dist/electron",
		nonElectronNuxtBuildDir: "~~/.dist/web/.output",
		devUserDataDir: "~~/.user-data-dir",
		electronRoute: "/app",
		autoOpen: process.env.AUTO_OPEN?.includes("electron"),
		electronBuildPackScript: "npm run build:electron:pack",
		additionalRoutes: [],
		extraCliArgs: [],
		debug: process.env.DEBUG === "*" || process.env.DEBUG?.includes("electron"),
		enable: true,
		electronOnlyRuntimeConfig: {},
		usePreloadScript: true,
		electronViteOptions: {},
	},
	async setup(options, nuxt) {
		if (!options.enable) { return}
		const moduleName = "@witchcraft/nuxt-electron"
		const logger = useLogger(moduleName, { level: options.debug ? 10 : 0 })
		const debug = options.debug
		const { resolvePath, resolve } = createResolver(import.meta.url)
		const srcDir = await resolvePath(options.srcDir, nuxt.options.alias)
		const nonElectronNuxtBuildDir = await resolvePath(options.nonElectronNuxtBuildDir, nuxt.options.alias)

		const eletronBuildDir = await resolvePath(options.electronBuildDir, nuxt.options.alias)
		const relativeElectronDir = path.relative(nuxt.options.rootDir, eletronBuildDir)
		// must be relative
		const electronNuxtDir = path.join(relativeElectronDir, ".output")
		// must be relative
		const electronBuildDir = path.join(relativeElectronDir, "build")
		// relative to nuxt dir
		const electronProdUrl = `${options.electronRoute}/index.html`
		const electronRoute = options.electronRoute

		const electronNuxtPublicDir = path.join(electronNuxtDir, "public")
		const isElectronBuild = process.env.BUILD_ELECTRON === "true"

		const autoOpen = options.autoOpen

		const electronRuntimeConfig = defu(
			options.electronOnlyRuntimeConfig,
			nuxt.options.runtimeConfig.public
		)

		const devUserDataDir = options.devUserDataDir && await resolvePath(options.devUserDataDir, nuxt.options.alias)
		if (devUserDataDir) {
			if (!await fs.stat(devUserDataDir).then(() => true).catch(() => false)) {
				await fs.mkdir(devUserDataDir, {
					recursive: true
				})
			}
		}
		// this is typed in app-electron/static.ts
		const electronVariables = {
			...createConstantCaseVariables({
				electronRoute,
				electronProdUrl,
				electronNuxtDir,
				electronNuxtPublicDir,
				electronBuildDir,
				// nuxt's runtimeConfig cannot be used in electron's main since it's built seperately
				// also we must stringify ourselves since escaped double quotes are not preserved in the final output :/
				electronRuntimeConfig: JSON.stringify(electronRuntimeConfig).replaceAll("\\", "\\\\"),
			}, "process.env."), // wut am having issue with just using STATIC. directly ???
		}


		const electronViteOptions: ElectronOptions["vite"] = defu(
			{
				build: {
				// must be false or preload can get deleted when vite rebuilds
					emptyOutDir: false,
				}
			},
			options.electronViteOptions,
			{
				build: {
					outDir: electronBuildDir,
					minify: false,
				},
				define: electronVariables,
				resolve: {
					alias: nuxt.options.alias,
				},
				plugins: [externalizeDeps() as any],
			})


		const electronCliArgs = [
			".",
			...(process.env.NODE_ENV !== "production"
					&& devUserDataDir
				? [
					"--user-data-dir",
					devUserDataDir,
				]
				: []),
			...(options.extraCliArgs ?? []),
		]

		logger.debug({
			electronViteOptions,
			electronCliArgs,
			srcDir,
			isElectronBuild,
			autoOpen,
			prodNonElectronNuxtDir: nonElectronNuxtBuildDir,
			electronVariables,
			electronRuntimeConfig,
		})

		let resolveGetViteServer: (res: ViteDevServer) => void
		// eslint-disable-next-line @typescript-eslint/no-shadow
		const viteServerPromise = new Promise<ViteDevServer>(resolve => {
			resolveGetViteServer = resolve
		})
		nuxt.hook("vite:serverCreated", server => {
			if (debug) {
				logger.info(`Resolved vite server.`)
			}
			resolveGetViteServer(server as any)
		})

		let resolveGetServerUrl: (res: Awaited<typeof viteServerUrlPromise | undefined>) => void
		// eslint-disable-next-line @typescript-eslint/no-shadow
		const viteServerUrlPromise = new Promise<string>(resolve => {
			resolveGetServerUrl = resolve as any
		})
		nuxt.hook("build:before", () => {
			resolveGetServerUrl(undefined)
		})
		nuxt.hook("listen", (_server, listener) => {
			if (debug) {
				logger.info(`Resolved server url.`, listener.url)
			}
			// listener does not have a type! :/
			resolveGetServerUrl(listener.url as string)
		})
		const builds: ElectronOptions[] = [
			{
				entry: path.join(srcDir, "main.ts"),
				onStart: async () => {
					// vite-plugin-electron adds --no-electron to deal with dev server issues on some linux distros, but it's working for me and we don't want it
					// https://github.com/electron-vite/vite-plugin-electron/pull/57
					await startup([...electronCliArgs])
				},
			},
			...(
				options.usePreloadScript ? [{
					entry: path.join(srcDir, "preload.ts"),
					onStart: async () => {
						(await viteServerPromise).hot.send({ type: "full-reload" })
					},
				}] : []
			)
		].map(entry => ({
			vite: {
				mode: process.env.NODE_ENV,
				...electronViteOptions,
				build: {
					watch: {
						include: [`${srcDir}/**/*`],
					},
					lib: {
						entry: entry.entry,
						formats: ["cjs"],
						fileName: () => "[name].cjs",
					},
					...electronViteOptions.build,
				},
				plugins: [
					{
						name: "plugin-start-electron",
						async closeBundle() {
							if (autoOpen) {
								await entry.onStart()
							}
						},
					},
					...(electronViteOptions.plugins ?? []),
				],
			},
		}))

		logger.debug(builds)

		let maybeWatchers: (RollupWatcher | RollupOutput | RollupOutput[])[]
		let started = false
		const buildElectron = async () => {
			if (maybeWatchers || started) return

			started = true
			const devUrl = await viteServerUrlPromise
			if (devUrl) {
				Object.assign(process.env, {
					VITE_DEV_SERVER_URL: devUrl.slice(0, -1),
				})
			}

			maybeWatchers = await Promise.all(builds.map(async config =>
				build(config).then(res => {
					if (debug) logger.info(`Build done.`)
					return res
				})
			))
			for (const maybeWatcher of maybeWatchers) {
				if (maybeWatcher && "on" in maybeWatcher) {
					maybeWatcher.on("change", e => {
						logger.info(`Detected change in: ${e}`)
					})
				}
			}
		}

		nuxt.hook("ready", async () => {
			if (debug) logger.info("electron - ready")
			void buildElectron()
		})

		nuxt.hook("restart", async () => {
			logger.info(`Killing and Restarting`)
			await startup.exit()
		})


		if (isElectronBuild) {
			// completely disable prefetching
			// https://github.com/nuxt/nuxt/issues/18376#issuecomment-1431318970
			nuxt.hook("build:manifest", manifest => {
				for (const key of Object.keys(manifest)) {
					manifest[key]!.dynamicImports = []
				}
			})

			nuxt.hook("pages:extend", (pages: NuxtPage[]) => {
				// the "/" is not technically needed but only if we properly split the chunks by pages and that was causing issues
				nuxtRemoveUneededPages(pages, ["/", electronRoute, ...options.additionalRoutes!])
			})
			extendRouteRules(electronRoute, { ssr: false, prerender: true }, { override: true })

			nuxt.options = defu(
				nuxtFileBasedRouting(),
				nuxtRerouteOutputTo(electronNuxtDir),
				nuxt.options
			)
			// the build:done hook doesn't work as nitro seems to build after
			nuxt.hook("close", async () => {
				logger.info(`Building and Packing Electron`)
				await buildElectron()
				const buildCommand = run(options.electronBuildPackScript, {
					stdio: "inherit",
				})

				await buildCommand.promise
					.catch(err => {logger.error("Error building electron.", err); process.exit(1)})
				// async close hook, causes nuxt to not exit
				setTimeout(() => {
					process.exit(0)
				}, 1)
			})
			// we need to override/add the options, if we use installModule they don't get added
			logger.debug(nuxt.options)
		} else {
			logger.info(`Skipping Electron Build`)
			nuxt.options = defu(
				nuxtRerouteOutputTo(nonElectronNuxtBuildDir),
				nuxt.options
			)
			nuxt.hook("close", async () => {
				if (!isElectronBuild) {
					logger.info(`Killing`)
					await startup.exit()
				}
			})
			logger.debug(nuxt.options)
		}
		addImportsDir(resolve("runtime/composables"))
		addRouteMiddleware({
			name: "electron-proxies",
			path: resolve("runtime/middleware/electronProxies"),
			global: true,
		})
	},
})


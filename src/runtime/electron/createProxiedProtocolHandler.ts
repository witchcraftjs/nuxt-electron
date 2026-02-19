import { keys } from "@alanscodelog/utils/keys"
import { pick } from "@alanscodelog/utils/pick"
import type { Protocol } from "electron"
import { net } from "electron"
import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"


const cache = new Map<string, string | undefined>()

async function getPathToServe(
	originalPath: string,
	pathWithIndexHtml: string,
	/** Usually the request url */
	key: string,
	logger?: {
		trace: (...args: any[]) => void
	}
) {
	if (cache.has(key)) {
		const result = cache.get(key)
		if (logger) {
			logger.trace({
				ns: "main:createProxiedProtocolHandler:cacheHit",
				requestUrl: key,
				result: cache.get(key)
			})
		}
		return result
	}
	const stats = await fs.stat(originalPath).catch(() => undefined)


	if (logger) {
		logger.trace({
			ns: "main:createProxiedProtocolHandler:stats",
			key,
			stats,
			isFile: stats?.isFile(),
			isDirectory: stats?.isDirectory()
		})
	}
	// if file exists get the file, if path/index.html exists get that
	const pathToServe = stats !== undefined
		? stats.isFile()
			? originalPath
			: stats.isDirectory()
				? (await fs.stat(pathWithIndexHtml).catch(() => undefined))?.isFile()
						? pathWithIndexHtml
						: undefined
				: undefined
		: undefined
	cache.set(key, pathToServe)
	return pathToServe
}
export function createProxiedProtocolHandler(
	/** `protocol` or `session.protocol` depending on if you're using paritions with your windows or not, regular `protocol` only registers the handler for the default parition. */
	protocol: Protocol,
	protocolName: string = "app",
	basePath: string,
	/**
	 * If any route starts with one of these keys, it will get rerouted to the given value.
	 *
	 * At least `/api` should be added for a basic nuxt app to work correctly.
	 *
	 *
	 * ```ts
	 * routeProxies: {
	 * 	"/api": "http://localhost:3000/api",
	 * }
	 * ```
	 */
	routeProxies: Record<string, string>,
	{
		logger,
		errorPage = "404.html"
	}: {
		/**
		 * Optional logger. It's suggested you not pass this unless you're traceging in dev mode as a lot of requests can be made.
		 */
		logger?: {
			trace: (...args: any[]) => void
			error: (...args: any[]) => void
		}

		/**
		 * The path to the error page. Defaults to "/404.html".
		 *
		 * The module forces nuxt to generate it as it's not rendered in build mode. This is only used for 404 errors. The 400 error for bad requests still just returns Bad Request for now. This might become more flexible in the future.
		 */
		errorPage?: string

	} = {}
): void {
	const routeProxyKeys = keys(routeProxies)
	if (protocol.isProtocolHandled(protocolName)) {
		throw new Error(`Protocol ${protocolName} is already handled.`)
	}
	if (routeProxyKeys.length > 0) {
		if (!process.env.PUBLIC_SERVER_URL && !process.env.VITE_DEV_URL && !process.env.PUBLIC_SERVER_URL) {
			throw new Error("You defined proxy routes but didn't set PUBLIC_SERVER_URL or VITE_DEV_URL set. This is required for the /api routes to work.")
		}
	}

	let errorPage404: string | undefined
	// note that while it would be nice to do protocol.isProtocolRegistered
	// to check the user correctly registered it
	// it's deprecated for some reason and also it doesn't work (so maybe because of that)!
	protocol.handle(protocolName, async request => {
		errorPage404 ??= await getPathToServe(path.join(basePath, errorPage), "404.html", "404.html", logger)

		if (!errorPage404) {
			throw new Error(`Error page ${path.join(basePath, errorPage)} does not exist. Did you override the routeRules for it?`)
		}

		const parsedUrl = new URL(request.url)
		// we can ignore the host, as getPaths sets it to bundle (e.g. protocol://bundle/path/to/file)
		const requestPath = decodeURIComponent(parsedUrl.pathname)

		const proxyKey = routeProxyKeys.find(key => requestPath.startsWith(key))

		if (proxyKey) {
			const proxyUrl = routeProxies[proxyKey]
			const finalPath = proxyUrl + requestPath
			if (logger) {
				logger.trace({
					ns: "main:createProxiedProtocolHandler:fetchingViaProxy",
					requestUrl: request.url,
					proxyKey,
					route: proxyUrl,
					requestPath,
					finalPath
				})
			}
			return net.fetch(finalPath, {
				...pick(request, ["headers", "destination", "referrer", "referrerPolicy", "mode", "credentials", "cache", "redirect", "integrity", "keepalive"])
			})
		}

		const originalPath = path.join(basePath, requestPath)
		const pathWithIndexHtml = path.join(originalPath, "index.html")

		// the safety checks are modified from this example
		// https://www.electronjs.org/docs/latest/api/protocol#protocolhandlescheme-handler
		const relativePath = path.relative(basePath, originalPath)
		const isSafe = !relativePath.startsWith("..") && !path.isAbsolute(relativePath)

		if (!isSafe) {
			if (logger) {
				logger.error({
					ns: "main:createProxiedProtocolHandler:badRequest",

					request: pick(request, [
						"url", "headers", "destination", "referrer", "referrerPolicy", "mode", "credentials", "cache", "redirect", "integrity", "keepalive",
						// these also seem to exist
						...(["isReloadNavigation", "isHistoryNavigation"] as any)
					]),
					requestPath,
					pathWithIndexHtml,
					relativePath,
					originalPath,
					isSafe
				})
			}

			return new Response(JSON.stringify({
				error: "Bad Request - Unsafe Path"
			}), {
				headers: { "content-type": "application/json" },
				status: 400
			})
		}


		const pathToServe = await getPathToServe(originalPath, pathWithIndexHtml, request.url, logger)

		if (!pathToServe) {
			if (logger) {
				logger.error({
					ns: "main:createProxiedProtocolHandler:noFileFound",
					requestUrl: request.url,
					originalPath,
					requestPath,
					pathWithIndexHtml,
					pathToServe,
					errorPath: pathToFileURL(errorPage404).toString()
				})
			}
			const res = await net.fetch(pathToFileURL(errorPage404).toString(), {
				// see below
				bypassCustomProtocolHandlers: true
			})
				.catch(err => err)
			return res
		}

		const finalPath = pathToFileURL(pathToServe).toString()
		if (logger) {
			logger.trace({
				ns: "main:createProxiedProtocolHandler:fetchingFile",
				requestUrl: request.url,
				finalPath,
				requestPath,
				originalPath
			})
		}

		const response = await net.fetch(finalPath, {
			// avoid infinite loop if protocolName protocol is "file"
			// or file is otherwise handled
			bypassCustomProtocolHandlers: true
		}).catch(err => {
			if (logger) {
				logger.error({
					ns: "main:createProxiedProtocolHandler:fetchError",
					requestUrl: request.url,
					finalPath,
					requestPath,
					originalPath,
					err
				})
			}
			return err
		})

		return response
	})
}

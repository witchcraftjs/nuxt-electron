import { keys } from "@alanscodelog/utils/keys.js"
import { type BrowserWindow, net } from "electron"
import path from "path"

export function createNuxtFileProtocolHandler(
	win: BrowserWindow,
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
): void {
	const routeProxyKeys = keys(routeProxies)
	win.webContents.session.protocol.handle("file", async request => {
		const url = decodeURIComponent(request.url.slice(7))
		const newUrl = path.isAbsolute(url)
			? path.resolve(basePath, url.slice(1))
			: path.resolve(basePath, url)

		const proxyKey = routeProxyKeys.find(key => url.startsWith(key))
		const windowUrl = win.webContents.getURL().slice(7)
		console.log({ windowUrl })
		// we must proxy requests to resources on proxied routes
		const isAtProxy = routeProxyKeys.includes(windowUrl)

		if (proxyKey || isAtProxy) {
			const proxyUrl = proxyKey
			? routeProxies[proxyKey]
			: routeProxies[windowUrl]
			const newProxyUrl = isAtProxy
				? proxyUrl + windowUrl
				: proxyUrl + url
			console.log({ newProxyUrl })
			return net.fetch(proxyUrl + url)
		} else {
			console.log("file", newUrl)
		}

		const res = await net.fetch(`file://${newUrl}`, {
			// avoid infinite loop
			bypassCustomProtocolHandlers: true,
		}).catch(err => new Response(err, { status: 404 }))
		return res
	})
}

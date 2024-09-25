/**
 * This requires electron's preload script set the `electron` property on the window:
 *
 * ```ts
 * // preload.ts
 * contextBridge.exposeInMainWorld("electron", { })
 * ```
 */
export function isElectron(): boolean {
	return typeof window !== "undefined" && "electron" in window && typeof window.electron !== "undefined"
}

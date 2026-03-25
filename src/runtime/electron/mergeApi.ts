import { get } from "@alanscodelog/utils/get"
import { set } from "@alanscodelog/utils/set"
import type { Flatten, OrToAnd } from "@alanscodelog/utils/types"
import { walk } from "@alanscodelog/utils/walk"

export function mergeApi<T extends Record<string, any>[]>(
	...apis: T
): Flatten<OrToAnd<T[number]>> {
	const result = {} as any
	for (const api of apis) {
		walk(api, (el, keyPath) => {
			const value = get(result, keyPath)
			const canExtend = typeof value === "object" || typeof value === "undefined"
			if (!canExtend) {
				throw new Error(`Value (${typeof value}) in way of keypath ${keyPath.join(".")}`)
			} else {
				set(result, keyPath, el)
			}
		})
	}
	return result
}

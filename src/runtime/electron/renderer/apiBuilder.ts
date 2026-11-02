import type { DeepPartial } from "@alanscodelog/utils"
import defu from "defu"
import type { IpcRenderer } from "electron"
/**
 * Helper for building an api object.
 *
 * @experimental
 */
export function apiBuilder<
	TPreloadMeta extends Record<string, any>,
	TRawApi extends Record<string, any> = Record<string, any>,
	TBuilders extends
	((meta: DeepPartial<TPreloadMeta>, ipcRenderer: IpcRenderer) => any)[] = ((meta: DeepPartial<TPreloadMeta>, ipcRenderer: IpcRenderer) => any)[],
	TBuilderOutput extends ReturnType<TBuilders[number]> = ReturnType<TBuilders[number]>
>(
	ipcRenderer: IpcRenderer,
	api: TRawApi,
	meta: TPreloadMeta,
	builders: TBuilders
): TRawApi & TBuilderOutput {
	const resolutions: object[] = []
	resolutions.push(api)
	for (const builder of builders) {
		resolutions.push(builder(meta, ipcRenderer))
	}
	return (defu as any)(...resolutions.reverse()) as any
}

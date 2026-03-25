import type { AnyFunction, Flatten, OrToAnd } from "@alanscodelog/utils/types"

export type WindowControlsApi = (action: "close" | "minimize" | "toggleMaximize" | "togglePin")	=> Promise<void>

export interface Register { }

// this is a version of my extension trick, regular version wasn't working
export type ElectronIpcMessages = Flatten<OrToAnd<{
	[K in keyof Register as K extends `ElectronIpc${string}` ? K : never]:
	Register[K] extends { func: infer TFunc extends AnyFunction, path: infer TPath extends string }
		? {
				[K2 in Register[K] extends { prefix: string } ? `${Register[K]["prefix"]}.${Register[K]["path"]}` : Register[K]["path"]]: {
					func: TFunc
					path: TPath
				}
			}
		: never
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
}[keyof Register & `ElectronIpc${string}`] | {}>>

export type PathToObject<TPath extends string, TValue>
	= TPath extends `${infer Head}.${infer Tail}`
		? { [K in Head]: PathToObject<Tail, TValue> }
		: { [K in TPath]: TValue }


export type ElectronIpcWindowApi = Flatten<OrToAnd<{
	[K in keyof ElectronIpcMessages]: PathToObject<K, ElectronIpcMessages[K]["func"]>
}[keyof ElectronIpcMessages]>>

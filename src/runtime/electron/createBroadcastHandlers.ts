import { ipcRenderer } from "electron"

export function createBroadcastHandlers<TEvents extends Record<string, (...args: any) => any>>(
	key: string
): {
	on: <T extends keyof TEvents>(event: T, listener: TEvents[T]) => void
	off: <T extends keyof TEvents>(event: T, listener: TEvents[T]) => void
} {
	const listeners = new Map<keyof TEvents, (TEvents[keyof TEvents])[]>()
	ipcRenderer.on(key, (_e, eventName, ...args: any[]) => {
		const cbs = listeners.get(eventName)
		if (cbs) {
			for (const cb of cbs) {
				cb(...args)
			}
		}
	})
	function on<T extends keyof TEvents>(event: T, listener: TEvents[T]): void {
		const cbs = listeners.get(event)
		if (cbs) {
			cbs.push(listener)
		} else {
			listeners.set(event, [listener])
		}
	}

	function off<T extends keyof TEvents>(event: T, listener: TEvents[T]): void {
		const cbs = listeners.get(event)
		if (cbs) {
			cbs.splice(cbs.indexOf(listener), 1)
		}
	}
	return {
		on, off
	}
}

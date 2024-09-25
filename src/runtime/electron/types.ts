export type WindowControlsApi = (action: "close" | "minimize" | "toggleMaximize" | "togglePin")	=> Promise<void>

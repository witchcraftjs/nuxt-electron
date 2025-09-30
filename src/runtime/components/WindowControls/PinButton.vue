<template>
<WButton
	aria-label="Toggle Always On Top"
	auto-title-from-aria
	:border="false"
	:class="twMerge(`
			p-0
			hover:text-accent-500
		`,
		alwaysOnTop && `
				[&_.default-icon_svg]:drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]
			`,
		!alwaysOnTop && `
				text-neutral-400
				dark:text-neutral-600
			`
	)"

	@click="emit('action', 'togglePin')"
>
	<slot v-bind="{ alwaysOnTop }">
		<WIcon
			:class="twMerge(
				`
				default-icon
				w-[var(--electron-wc-size)]
				h-[var(--electron-wc-size)]
				flex items-center justify-center
				scale-105
			`
			)
			"
		>
			<iOcticonPin16/>
		</WIcon>
	</slot>
</WButton>
</template>

<script lang="ts" setup>
import { twMerge } from "#imports"
import iOcticonPin16 from "~icons/octicon/pin-16"

const emit = defineEmits<{
	(e: "action", action: "togglePin"): void
}>()
/**
 * If there is a `window.electron.on` api that allows listening to events and main sends an `always-on-top-changed`, it will update the state of the pin.
 */
const alwaysOnTop = defineModel<boolean>({ default: false })

if (import.meta.client && (window as any)?.electron?.on) {
	(window as any).electron.on("always-on-top-changed", (val: boolean) => {
		alwaysOnTop.value = val
	})
}
</script>

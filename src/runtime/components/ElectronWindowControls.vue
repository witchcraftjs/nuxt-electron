<template>
<ClientOnly>
	<div
		v-if="isElectron()"
		:class="twMerge(`
		flex
		items-center
		gap-2
	`, ($attrs as any).class)"
		v-bind="{ ...$attrs, class: undefined }"
		:style="`
		--electron-wc-size:${props.buttonSize};
		--electron-wc-border:${props.borderWidth};
		--electron-wc-rounded:${props.borderRadius};
		--electron-wc-diagonal:calc((var(--electron-wc-size) - var(--electron-wc-border)/2)*sqrt(2));
	`"
	>
		<template
			v-for="button in buttonsOrder"
			:key="button"
		>
			<component
				:is="componentsMap[button]"
				@action="actionHandler($event)"
			/>
		</template>
	</div>
</ClientOnly>
</template>

<script lang="ts" setup>
// eslint-disable-next-line import/no-extraneous-dependencies
import { type Component, computed, useAttrs } from "vue"

import CloseButton from "./WindowControls/CloseButton.vue"
import MaximizeButton from "./WindowControls/MaximizeButton.vue"
import MinimizeButton from "./WindowControls/MinimizeButton.vue"
import PinButton from "./WindowControls/PinButton.vue"

import { twMerge } from "#imports"

import type { WindowControlsApi } from "../electron/types.js"
import { isElectron } from "../utils/isElectron.js"

const $attrs = useAttrs()

const props = withDefaults(defineProps<{
	borderWidth?: string
	buttonSize?: string
	borderRadius?: string
	/**
	 *
	 * Replace any of the default buttons with your own components.
	 *
	 * Note that you can get the existing button components (import from `/components/WIndowControls/[name]`) and pass a slot to change the icon then pass your new component here.
	 *
	 * If using a completely custom component, it must emit an `action` event with the action name as the value.
	 *
	 * This wrapper component sets the following css variables if you need them:
	 * `--electron-wc-size`
	 * `--electron-wc-border`
	 * `--electron-wc-rounded`
	 * `--electron-wc-diagonal` (useful for creating the close cross)
	 */
	components?: Partial<Record<"CloseButton" | "MinimizeButton" | "MaximizeButton" | "PinButton", Component>>
	buttonsOrder?: ("CloseButton" | "MinimizeButton" | "MaximizeButton" | "PinButton")[]
	handler?: WindowControlsApi
}>(), {
	borderWidth: "2px",
	buttonSize: "15px",
	borderRadius: "1.5px",
	buttonsOrder: () => (["PinButton", "MinimizeButton", "MaximizeButton", "CloseButton"])
})
const componentsMap = computed(() => ({
	CloseButton,
	MinimizeButton,
	MaximizeButton,
	PinButton,
	...props.components
}))
const actionHandler = computed(() => {
	if (!isElectron()) return undefined
	if (!props.handler) {
		const defaultHandlerPath = (window as any).electron?.api?.ui?.windowAction
		if (defaultHandlerPath) {
			return defaultHandlerPath
		} else {
			// eslint-disable-next-line no-console
			console.warn("No ElectronWindowControls handler specified and could not find default handler at `window.electron.api.ui.windowAction`")
		}
	}
	return props.handler
})
</script>

import { defineNuxtRouteMiddleware } from "#app"

import { useIsElectron } from "../composables/useIsElectron.js"

const isElectron = useIsElectron()
export default defineNuxtRouteMiddleware((to, from) => {
	if (import.meta.client && isElectron) {
		if (to.path.startsWith("/serverOnly")) {
			window.location.href = window.location.host + to.path
		}
	}
})

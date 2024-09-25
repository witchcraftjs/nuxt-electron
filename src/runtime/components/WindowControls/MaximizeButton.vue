<template>
<WButton
	:border="false"
	aria-label="Toggle Maximize"
	class="
			p-0
			[&:hover_.default-icon]:border-accent-500
			[&:hover_.default-icon]:shadow-xs
			[&:hover_.default-icon]:shadow-fg/50

		"
	@click="emit('action', 'toggleMaximize')"
>
	<slot>
		<div
			class="
				default-icon
				border-fg
				dark:border-bg
				hover:border-accent-500
				border-[length:var(--electron-wc-border)]
				rounded-(--electron-wc-rounded)
				w-[var(--electron-wc-size)]
				h-[var(--electron-wc-size)]
			"
		/>
	</slot>
</WButton>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
	(e: "action", action: "toggleMaximize"): void
}>()
</script>

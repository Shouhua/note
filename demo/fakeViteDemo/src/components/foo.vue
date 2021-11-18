<template>
	<div class="foo">name</div>	
</template>
<script>
import { ref } from 'vue'

export default {
	setup() {
		return {
			name: ref('Foo')
		}
	},
}
</script>
<style scoped>
.foo {
	color: lightcyan
}
</style>

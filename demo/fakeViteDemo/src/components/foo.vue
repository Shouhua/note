<template>
	<div class="foo">name</div>	
</template>
<script>
import { ref } from 'vue'
import { fooDebug } from '../utils/index.js'

export default {
	setup() {
		fooDebug('fooooooooooooooooooooooooo')
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

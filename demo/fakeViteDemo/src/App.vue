<template>
	<h1>helo, world</h1>
	<div class="red">{{ count }}</div>
	<button @click="handleClick">Click</button>
</template>

<script>
import {ref} from 'vue'
import { debounce, throttle } from 'lodash-es'

export default {
	setup() {
		let count = ref(0)
		return {
			count,
			handleClick: throttle(() => count.value += 1, 500)
		}
	}
}
</script>

<style>
.red {
	color: red;
	font-size: 60px;
}
</style>
<template>
	<h1>helo world!</h1>
	<div class="green">{{ name }}</div>
	<input type="range">
	<div class="red">{{ count }}</div>
	<button @click="handleClick">Click</button> 
	<!-- <div class="url">css url</div> -->
	<div><img src="./cx.jpeg" alt=""></div>
</template>

<script>
import {ref} from 'vue'
import { debounce } from 'lodash-es'
import person from './person.json'
import './style.css'

export default {
	setup() {
		let count = ref(0)
		let name = ref(person.name)
		return {
			count,
			name,
			// handleClick: () => count.value += 10
			handleClick: debounce(() => count.value += 10)
		}
	}
}
</script>

<style>
.red {
	color: red;
	font-size: 60px;
}
/* .url {
	background: url('./cx.jpeg');
} */
</style>
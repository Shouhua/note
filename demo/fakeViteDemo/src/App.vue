<template>
	<h1>helo world!</h1>
	<foo />
	<div class="green">{{ name }}</div>
	<div :class="s.foo">module style</div>
	<div :class="$style.bar">inline module style</div>
	<input type="range">
	<div class="red">{{ count }}</div>
	<button @click="handleClick">Click</button> 
	<div class="url">css url</div>
	<div><img src="./cx.jpeg" alt=""></div>
</template>

<script>
import { ref, reactive } from 'vue'
import { debounce } from 'lodash-es'
import person from './person.json'
import './style.css'
import styleModule from './style.module.css'
import Foo from './components/foo.vue'
import browser from 'debug'

localStorage.debug = 'foo'
const debug = new browser('foo')

export default {
	components: {
		Foo
	},
	setup() {
		let count = ref(0)
		let name = ref(person.name)
		const s = reactive(styleModule)
		debug('foooooooooooooooooooooo')
		return {
			s,
			count,
			name,
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
</style>
<style module>
.bar {
	color:blue;
}
</style>
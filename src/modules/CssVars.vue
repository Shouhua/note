<template>
  <div class="text">hello, css vars</div>
	<button @click="handleClick">Change Color</button>
</template>

<script>
/**
 * https://github.com/vuejs/rfcs/pull/231
 * https://github.com/vuejs/rfcs/blob/style-vars-2/active-rfcs/0000-sfc-style-variables.md
 * 新版本css vars，以前是<style vars="{color, fontSize}">
 */
	import { ref, reactive, useCssVars } from 'vue'
  export default {
    // data() {
    //   return {
    //     color: 'red',
    //     font: {
    //       size: '2em'
    //     }
    //   }
    // }
		setup() {
			const color = ref('red')
			const font = reactive({
				size: '2em'
			})
			const handleClick = () => color.value = color.value === 'green' ? 'red' : 'green'
		// 	useCssVars((_ctx) => ({
    //   color: _ctx.color.value,
    //   font_size: _ctx.font.size,
    // }))
			return {
				color,
				font,
				handleClick
			}
		}
	}
</script>

<style>
  .text {
    color: v-bind(color);

    /* expressions (wrap in quotes) */
    font-size: v-bind('font.size');
  }
</style>
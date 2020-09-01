<template>
  <div @vnodeBeforeUpdate="handleVnodeBeforeUpdate">
    <div> {{ msg }}</div>
    {{ $attrs }}
    <button v-bind="$attrs">Click me</button>
    <input
      type="text"
      :value="greetText"
      @input="event => $emit('update:greetText', event.target.value)">
  </div>
</template>
<script>
import { computed, onBeforeUpdate, onMounted, onVnode } from 'vue';

export default {
  inheritAttrs: false,
  props: {
    greetText: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: 'world'
    }
  },
  setup(props) {
    const msg = computed(() => { return `Hello, ${props.name}`; });
    return {
      msg,
      handleVnodeBeforeUpdate: (vnode) => {
        console.log(vnode)
      }
    }
  }
}
</script>
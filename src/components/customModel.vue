<template>
  <div @click="emit('click', helo)" :value="value">say hello</div> 
  <input type="text" v-model='helo'>
</template>

<script>
import { ref } from 'vue'

export default {
  // model: {
  //   prop: 'greet',
  //   event: 'click'
  // },
  props: {
    value: {
      type: String,
      default: ''
    }
  },
  setup(props, {emit}) {
    const helo = ref('custom model')
    return {
      helo,
      emit
    }
  }
}
</script>

<style>

</style>
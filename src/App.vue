<template>
  <h2>Vue3 Demo</h2>
  <input type="text" v-model="greetText">
  <greet :name="state.name"
    id="greetId"
    class="greet-class"
    v-model:greetText="greetText"
    @click="handleGreetClick"></greet>
    greetText: {{greetText}}
  <count></count>
  <!-- <router-link to="/">home</router-link>
  <router-link to="order">to order</router-link>
  <router-link to="about">to about</router-link>
  <router-view>
    <span>default view</span>
  </router-view> -->
</template>
<script>
import Greet from './modules/greet';
import Count from './modules/count';
import { reactive, ref } from 'vue';

export default {
  components: {
    Greet,
    Count,
  },
  setup() {
    const state = reactive({
      name: 'world'
    });
    const greetText = ref('');
    return {
      greetText,
      state,
      handleGreetClick: () => console.log('handle greet click')
    }
  }  
}
</script>
<style>
.greet-class {
  background: lightblue;
}
</style>

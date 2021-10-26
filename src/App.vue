<template>
  <!-- <h2>Vue3 Demo</h2> -->
  <div class="test">helo, app</div>
  <p :class="helo.red">
    This should be red
  </p>
  <!-- <css-vars/> -->
  <!-- <router-link to="/">home</router-link>
  <router-link to="order">to order</router-link>
  <router-link to="about">to about</router-link>
  <router-view>
    <span>default view</span>
  </router-view> -->
  <!-- <greet>
    <div class="slot-parent">
      <span>greet default slot</span>
    </div>
  </greet> -->
  <!-- <button class="rounded border-2 border-blue-500 text-xl text-blue-500
    hover:border-2 hover:text-white hover:bg-blue-500 p-1
  " @click="handleTeleportClick">Click Me</button>
  <Teleport to="body">
    <div v-show="!disabled" class="z-30 bg-red-500 text-white
    absolute top-0 left-0">Helo,world!</div>
  </Teleport> -->
</template>
<script>
// import Greet from './modules/greet';
// import Count from './modules/count';
import { reactive, ref, useCssModule } from 'vue';
// import CssVars from './modules/CssVars.vue';

export default {
  components: {
    // Greet,
    // Count,
    // CssVars,
  },
  setup() {
    const state = reactive({
      name: 'world'
    });
    const greetText = ref('');
    const disabled = ref(true)
    const handleTeleportClick = () => {
      disabled.value = !disabled.value
      console.log(disabled.value)
    }
    const color = ref('red')
    const font = reactive({
      size: '2em'
    })
    let helo = useCssModule()
    console.log(helo)
    return {
      helo,
      greetText,
      state,
      handleGreetClick: () => console.log('handle greet click'),
      disabled,
      handleTeleportClick,
      color,
      font
    }
    // return () => (
    //   <>
    //     <div>Helo, world!</div>
    //   </>
    // )
  }  
}
</script>
<style module>
.red {
  color: red;
}
</style>
<style>
/* ::v-slotted(.slot-parent) {
  color: blue;
} */
.test {
  color: v-bind(color);
    /* expressions (wrap in quotes) */
    font-size: v-bind('font.size');
}
</style>

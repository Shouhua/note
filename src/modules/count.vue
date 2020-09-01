<template>
  <button class="btn"
    @click="handleClick">count: {{ count }}</button>
</template>
<script>
import { ref, watch } from 'vue';
export default {
  setup() {
    const count = ref(0);
    const handleClick = () => { count.value++ };
    watch(() => count.value + 1, (count) => {
      console.log('click count: ', count);
    }, {
      lazy: true,
      // deep: true,
      // flush: 'pre',
      onTrack: (debugEvent) => console.log('on track: ', debugEvent),
      onTrigger: (debugEvent) => console.log('on trigger: ', debugEvent)
    })
    return {
      count,
      handleClick
    }
  } 
}
</script>
<style scoped>
.btn {
  font-size: 14px;
}
</style>
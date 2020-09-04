/**
 * 解释为什么执行activeEffect时候要先执行computed
 */
import { ref, computed } from 'vue'
import { effect } from '@vue/reactivity'

const count = ref(0)
const plusOne = computed(() => {
  return count.value + 1
})

// 相当于view
effect(() => {
  console.log(plusOne.value + count.value)
})

function plus() {
  count.value++
}

plus()
import { initCustomFormatter } from '@vue/runtime-dom'

export function initDev() {
  if (__BROWSER__) {
    // global / esm build
    if (!__ESM_BUNDLER__) {
      console.info(
        `You are running a development build of Vue.\n` +
          `Make sure to use the production build (*.prod.js) when deploying for production.`
      )
    }

    initCustomFormatter()
  }
}

const { createSSRApp, h, ref } = require('vue')
const { renderToString } = require('@vue/server-renderer')

const app = createSSRApp({
  setup() {
    let msg = ref('hello')
    return () => h('div', null, msg.value)
  }
})

;(async () => {
  const html = await renderToString(app)
  console.log(html)
})()
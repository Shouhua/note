let protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
const socketUrl = `${protocol}//${location.hostname}:3000`
const socket = new WebSocket(socketUrl, 'fake-vite-hmr')

// export function updateStyle(id, url) {
//   const linkId = `vue-style-${id}`
//   let link = document.getElementById(linkId)
//   if (!link) {
//     link = document.createElement('link')
//     link.id = linkId
//     link.setAttribute('rel', 'stylesheet')
//     link.setAttribute('type', 'text/css')
//     document.head.appendChild(link)
//   }
//   link.setAttribute('href', url)
// }

console.log('[fakeVite] connecting...')

const sheetsMap = new Map()
export function updateStyle(id, content) {
  let style = sheetsMap.get(id)
  if(!style) {
    style = new CSSStyleSheet()
    style.replaceSync(content)
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, style]
  }
  sheetsMap.set(id, style)
}

socket.addEventListener('close', (ev) => {
  console.log(`[fakeVite] server connection lost. polling for restart...`)
  setInterval(() => {
    fetch('/').then(() => {
      location.reload()
    }).catch(e => {})
  }, 1000)
})

socket.addEventListener('message', async ({data}) => {
  const { type, path, id, index, timestamp } = JSON.parse(data)
  if(type === 'connected') {
    console.log('[fakeVite] connected')
  }
  if(type === 'rerender') {
    import(`${path}?vue&type=template&t=${timestamp}`).then(m => {
      __VUE_HMR_RUNTIME__.rerender(path, m.render)
    })
  }
  if(type === 'reload') {
    import(`${path}?vue&t=${timestamp}`).then(m => {
      __VUE_HMR_RUNTIME__.reload(path, m.default)
    })
  }
  if(type === 'style-update') {
    updateStyle(id, `${path}?vue&type=style&index=${index}&t=${timestamp}`)
  }
  if(type === 'full-reload') {
    location.reload()
  }
})
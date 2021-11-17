const socketUrl = `ws://${location.hostname}:3030`
const socket = new WebSocket(socketUrl)

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

socket.addEventListener('message', async ({data}) => {
  const payload = JSON.parse(data)
  console.log(payload)
  if(payload.type === 'rerender') {
    import(`${payload.path}?type=template&t=${payload.timestamp}`).then(m => {
      __VUE_HMR_RUNTIME__.rerender(payload.path, m.render)
    })
  }
  if(payload.type === 'reload') {
    import(`${payload.path}?t=${payload.timestamp}`).then(m => {
      __VUE_HMR_RUNTIME__.reload(payload.path, m.default)
    })
  }
  if(payload.type === 'style-update') {
    updateStyle(payload.id, `${payload.path}?type=style&index=${payload.index}&t=${payload.timestamp}`)
  }
  if(payload.type === 'full-reload') {
    location.reload()
  }
})
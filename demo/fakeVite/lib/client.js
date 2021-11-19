let protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
const socketUrl = `${protocol}//${location.hostname}:${__HMR_PORT__}`
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

function removeStyle(id) {
  let style = sheetsMap.get(id)
  if (style) {
    document.head.removeChild(style)
    // if (style instanceof CSSStyleSheet) {
    //   // @ts-ignore
    //   const index = document.adoptedStyleSheets.indexOf(style)
    //   // @ts-ignore
    //   document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
    //     (s: CSSStyleSheet) => s !== style
    //   )
    // } else {
    //   document.head.removeChild(style)
    // }
    sheetsMap.delete(id)
  }
}

const sheetsMap = new Map()
export function updateStyle(id, content) {
  let style = sheetsMap.get(id)
  if (style && !(style instanceof HTMLStyleElement)) {
    removeStyle(id)
    style = undefined
  }

  if (!style) {
    style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    style.innerHTML = content
    document.head.appendChild(style)
  } else {
    style.innerHTML = content
  }
  // if (supportsConstructedSheet && !content.includes('@import')) {
  //   if (style && !(style instanceof CSSStyleSheet)) {
  //     removeStyle(id)
  //     style = undefined
  //   }

  //   if (!style) {
  //     style = new CSSStyleSheet()
  //     style.replaceSync(content)
  //     // @ts-ignore
  //     document.adoptedStyleSheets = [...document.adoptedStyleSheets, style]
  //   } else {
  //     style.replaceSync(content)
  //   }
  // } else {
  //   if (style && !(style instanceof HTMLStyleElement)) {
  //     removeStyle(id)
  //     style = undefined
  //   }

  //   if (!style) {
  //     style = document.createElement('style')
  //     style.setAttribute('type', 'text/css')
  //     style.innerHTML = content
  //     document.head.appendChild(style)
  //   } else {
  //     style.innerHTML = content
  //   }
  // }
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
    // updateStyle(id, `${path}?vue&type=style&index=${index}&t=${timestamp}`)
    const el = document.querySelector(`link[href*='${path}']`)
    if (el) {
      el.setAttribute(
        'href',
        `${path}${path.includes('?') ? '&' : '?'}t=${timestamp}`
      )
    }
    // imported CSS
    const importQuery = path.includes('?') ? '&import' : '?import'
    await import(`${path}${importQuery}&t=${timestamp}`)
    console.log(`[fakeVite] ${path} updated.`)
  }
  if(type === 'full-reload') {
    location.reload()
  }
})
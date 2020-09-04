// import './script.css'

let container = document.querySelector('.console-container')
if(!container) {
  container = document.createElement('div')
  container.className = 'console-container'
  document.body.appendChild(container)
}

let callStack = []

function addInfo(msg) {
  if(callStack.length < 100) {
    callStack.push(msg)
    for(let item of callStack) {
      card = document.createElement('div')
      card.className = 'card'
      card.textContent = item
      container.appendChild(card)
    }
  }
}

// console.error = (...args) => {
//   addInfo(args, 'error')
//   console.error(...args)
// }

console.log = (...args) => {
  addInfo(args, 'info')
  console.log(...args)
}

// console.warn = (...args) => {
//   addInfo(args, 'warning')
//   console.warn(...args)
// }

// console.info = (...args) => {
//   addInfo(args, 'info')
//   console.info(...args)
// }

// window.addEventListener('error', (error) => {
//   // if (__DEV__) {
//   //   consoleError(`[logbox] detected global error`)
//   // }
//   addInfo([error], 'error')
//   console.error(error)
// })

// window.addEventListener('unhandledrejection', (error) => {
//   addInfo([error], 'error')
//   console.error(error)
// })
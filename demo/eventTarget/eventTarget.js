'use strict'

const backBtn = document.querySelector('#back')
const forwardBtn = document.querySelector('#forward')

backBtn.addEventListener('click', (event) => {
  history.replaceState({
    action: 'back',
    positionY: window.pageYOffset
  }, 'hello back', null)

  history.pushState(null, '', '#abc')
})

window.addEventListener('popstate', (event) => {
  console.log('popstate catched: ', event)
})

const body = document.querySelector('body')
const ul = document.createElement('ul')
body.appendChild(ul)
const li1 = document.createElement('li')
li1.innerHTML = 'li1'
const li2 = document.createElement('li')
li2.innerHTML = 'li2'
ul.appendChild(li1)
ul.appendChild(li2)

function handleClick(event) {
  /**
   * 点击li后:
   * target表示li对象, 实际触发的原始对象
   * currentTarget表示ul对象，实际的监听事件的对象
   */
  console.log(event.target)
  console.log(event.currentTarget)
}

ul.addEventListener('click', handleClick)

li1.click()

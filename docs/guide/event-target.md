# [Event target](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/target)
DOM事件中event有2个属性值，target和currentTarget，当事件处理程序在事件的冒泡或者捕获阶段被调用时，它与Event.currentTarget不同
```js
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
```
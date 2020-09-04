import 'jsdom-global/register';
import { createRenderer, h } from '@vue/runtime-core';
import { patchProp, nodeOps } from '@vue/runtime-dom';
import pretty from 'pretty';
import * as DOM from '@vue/runtime-dom';

const originH = DOM.h;
DOM.h = (...args) => {
  console.log(args);
  return originH(...args);
}

const { createApp } = createRenderer({
  ...nodeOps,
  ...patchProp,
  insert: (el, parent, anchor) => {
    el.style = 'background: blue';
    if(anchor) {
      parent.insertBefore(el, anchor);
    } else {
      parent.appendChild(el);
    }
  }
});

const el = document.createElement('div');
el.id = 'app';
document.body.appendChild(el);

const Hello = {
  mount() {
    console.log('hello, mount');
  },
  render() {
    return h('div', 'custom component');
  }
}

const App = {
  setup() {
    return () => h('div', h(Hello));
  }
}

createApp(App).mount(document.getElementById('app'));
console.log(pretty(document.body.innerHTML));
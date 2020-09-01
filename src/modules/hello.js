import { defineComponent, h } from 'vue';

export defineComponent({
  props: {
    msg: String
  },
  setup(props) {
    return () => h('div', [
      h('p', `msg is ${props.msg}`)
    ])
  }
});
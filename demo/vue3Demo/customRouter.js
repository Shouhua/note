import { watch, toRaw, defineComponent, h, reactive, ref, computed, inject, provide } from 'vue'

export class VueRouter {
  constructor(options) {
    this.options = options
    const initPath = window.location.hash.slice(1) || '/'

    this.current = ref(initPath)
    this.matched = ref([])

    window.addEventListener('hashchange', this.hashChange.bind(this))
    this.hashChange.apply(this)
  }
  hashChange() {
    this.current.value = window.location.hash.slice(1) || '/'
    this.matched.value = []
    this.match.apply(this)
  }
  match(routes) {
    const _routes = routes || this.options.routes
    for (const route of _routes) {
      if (route.path === '/' && this.current.value === '/') {
        // this.matched.value.push(route)
        this.matched.value = [ route ]
        return
      }
      if(route.path !== '/') {
        if (this.current.value.indexOf(route.path) !== -1) {
          // this.matched.value.push(route)
          this.matched.value = [ route ]
          if(route.children) {
            this.match(route.children)
          }
          return
        }       
      }
    }
  }
  install(app) {
    installFn(app, this)
  }
}
const installFn = function(app, router) {
  app.component('router-link', {
    props: {
      to: {
        type: String,
        required: true
      }
    },
    setup(props, {slots}) {
      return () => {
        return h('a', {href: `#${props.to}`, style: {display: 'block'}}, [slots.default()])
      }
    }
  })
  app.component('router-view', {
    name: 'RouterView',
    setup(props, {slots}) {
      // const route = computed(() => router.matched)
      const route = computed(() => router.matched.value[0].component)
      return () => {
        return h('div', [ route ? h(toRaw(route.value)) : null ]) 
      }
    }
  })
  app.provide('router', reactive(router.matched))
  app.config.globalProperties.$router = router
}
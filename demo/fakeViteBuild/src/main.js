// import { createApp } from 'vue'
// import App from './App.vue'

// createApp(App).mount('#app')
import foo from './foo.js'

foo()

import('./bar').then(res => {
	res.default()
})
import App from './App.vue'
import { createApp } from 'vue'

localStorage.setItem('debug', 'app')
createApp(App).mount('#app')

import {createApp, computed} from 'vue'
import App from './App'
import './index.css'
// import { VueRouter } from '../demo/cumstomRouter.js'
// import Order from './components/order.vue'
// import About from './components/about.vue'
// import Home from './components/home.vue'

const app = createApp(App)

// const router = new VueRouter({
//   routes: [{
//     path: '/',
//     component: Home
//   },
//   {
//     path: 'order',
//     component: Order
//   },
//   {
//     path: 'about',
//     component: About
//   }]
// })
// app.use(router)
app.mount('#app');
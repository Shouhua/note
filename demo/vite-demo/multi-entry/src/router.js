import { createRouter, createWebHashHistory } from 'vue-router'

const rawRouters = import.meta.globEager('./modules/**/*.router.js');
const routes = [
	{
		path: '/',
		redirect: '/home'
	}
]
for(const path in rawRouters) {
	const route = rawRouters[path]
	routes.push(...(route.default || route))
}

const router = createRouter({
	history: createWebHashHistory(),
	routes
})

export default router
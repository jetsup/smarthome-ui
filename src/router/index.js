import { createRouter, createWebHistory } from 'vue-router'

import DefaultLayout from '../layouts/DefaultLayout.vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'

const routes = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', name: 'Landing', component: () => import('../views/Landing.vue') },
      { path: 'about', name: 'About', component: () => import('../views/About.vue') },
      { path: 'contact', name: 'Contact', component: () => import('../views/Contact.vue') },
      { path: 'login', name: 'Login', component: () => import('../views/Login.vue') },
      { path: 'register', name: 'Register', component: () => import('../views/Register.vue') },
      { path: 'gateway/link', name: 'GatewayLink', component: () => import('../views/GatewayLink.vue') },
    ],
  },
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'gateways',
        name: 'Gateways',
        component: () => import('../views/GatewayList.vue'),
        meta: { title: 'Gateways' },
      },
      {
        path: 'gateways/create',
        name: 'GatewayCreate',
        component: () => import('../views/GatewayCreate.vue'),
        meta: { title: 'New Gateway' },
      },
      {
        path: 'gateways/:id',
        name: 'GatewayDetail',
        component: () => import('../views/GatewayDetail.vue'),
        meta: { title: 'Gateway' },
      },
      {
        path: 'nodes/discover',
        name: 'NodeDiscovery',
        component: () => import('../views/NodeDiscovery.vue'),
        meta: { title: 'Find Nodes' },
      },
      {
        path: 'nodes/:nodeId',
        name: 'NodeDetail',
        component: () => import('../views/NodeDetail.vue'),
        meta: { title: 'Node' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './theme.css'
import App from './App.vue'
import Icon from './components/Icon.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.component('Icon', Icon)
app.mount('#app')

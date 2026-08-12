import { createApp } from 'vue'
import App from './App.vue'
import { router } from './app/router'
import 'diff2html/bundles/css/diff2html.min.css'
import './styles.css'

createApp(App).use(router).mount('#app')

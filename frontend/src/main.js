import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import mixins from './mixins'
import VueSweetalert2 from 'vue-sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

createApp(App).use(store).use(router).mixin(mixins).use(VueSweetalert2).mount('#app')

window.Kakao.init('b5e71b4533fd4b3c27ba4ef339a82300')

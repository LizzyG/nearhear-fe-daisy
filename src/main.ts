import { createApp } from 'vue';

import App from './App.vue';
import router from './router';
import './style.css';

document.documentElement.setAttribute('data-theme', 'nearhear');

createApp(App).use(router).mount('#app');

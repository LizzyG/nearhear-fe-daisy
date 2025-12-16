import { createApp } from 'vue';

import App from './App.vue';
import router from './router';
import './style.css';
import 'cally';

// Initialize iOS WebView bridge - registers functions on window for native app access
import './utils/iosBridge';

createApp(App).use(router).mount('#app');

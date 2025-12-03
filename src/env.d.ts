/// <reference types="vite/client" />

import type { CalendarDate, CalendarMonth, CalendarRange } from 'cally';

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    'calendar-date': typeof CalendarDate;
    'calendar-month': typeof CalendarMonth;
    'calendar-range': typeof CalendarRange;
  }
}

declare global {
  interface Window {
    __NEARHEAR_API_ENV__?: 'prod' | 'local';
  }
}

export {};

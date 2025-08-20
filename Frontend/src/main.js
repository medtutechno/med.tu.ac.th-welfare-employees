import { createApp } from "vue";
import App from "./App.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import router from "./router";

import "./assets/font.css";

// Import global Vuetify styles and Material Design Icons.
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

// Create a Vuetify instance with all components and directives registered.
const vuetify = createVuetify({
  components,
  directives,
});

// Create the application instance, register the router and Vuetify,
// and mount it onto the #app element in index.html.
createApp(App).use(router).use(vuetify).mount("#app");

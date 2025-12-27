import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "WordPower",
    description: "Extension that shows an icon in text fields when typing",
    version: "0.0.1",
    action: {
      default_popup: "popup.html",
    },
    options_ui: {
      page: "prompt-settings.html",
      open_in_tab: true,
    },
    permissions: ["storage", "alarms"],
    web_accessible_resources: [
      {
        resources: ["icon/*.png"],
        matches: ["<all_urls>"],
      },
    ],
    host_permissions: ["http://*/*", "https://*/*"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { localCmsPlugin } from "./localCmsPlugin.js";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localCmsPlugin()],
  base: "/my-portfolio/",
});

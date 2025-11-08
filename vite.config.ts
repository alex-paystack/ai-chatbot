import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    port: 3300,
  },
  ssr: {
    /**
     * Streamdown imports KaTeX CSS directly, which Node can't load when the
     * package is externalized during SSR. Bundling it lets Vite handle the CSS.
     */
    noExternal: ["streamdown"],
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Bind to 0.0.0.0 so the app is reachable from a phone on the same network.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
});

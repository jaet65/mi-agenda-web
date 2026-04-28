import js from "@eslint/js";
import globals from "globals";

export default [
  {
    // Archivos a ignorar completamente
    ignores: ["dist/**", "node_modules/**", "vite.config.js"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        firebase: "readonly",
        FullCalendar: "readonly",
        L: "readonly",
        XLSX: "readonly",
        html2canvas: "readonly",
        html2pdf: "readonly",
        PDFLib: "readonly",
        google: "readonly",
        gapi: "readonly"
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "warn",
      "no-undef": "off", // Desactivado temporalmente por la estructura del proyecto
      "no-redeclare": "off", // Desactivado temporalmente por duplicados en app.js
      "no-unused-expressions": "off",
      "quotes": ["error", "double"],
      "semi": ["error", "always"],
    },
  },
];

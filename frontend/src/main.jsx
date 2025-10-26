// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n/config.js";
import App from "./App.jsx";
import CartProvider from "./context/CartProvider.jsx";
import { ConfirmProvider } from "./components/ui/ConfirmDialog.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <CartProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </CartProvider>
    </LanguageProvider>
  </StrictMode>
);

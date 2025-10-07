// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import CartProvider from "./context/CartProvider.jsx";
import { ConfirmProvider } from "./components/ui/ConfirmDialog.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CartProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </CartProvider>
  </StrictMode>
);

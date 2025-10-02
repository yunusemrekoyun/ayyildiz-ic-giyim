// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LayoutSelector from "./components/layout/LayoutSelector";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import SetsPage from "./pages/SetsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import AuthSelector from "./components/auth/AuthSelector";
import AboutPage from "./pages/AboutPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Tüm siteyi tek LayoutSelector sarıyor (hem seçim hem guard) */}
        <Route element={<LayoutSelector />}>
          {/* Public */}
          <Route index element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/sets" element={<SetsPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/account" element={<AuthSelector />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Admin (guard işini LayoutSelector yapıyor) */}
          <Route
            path="/admin"
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />

          <Route path="/admin/products" element={<div>Admin Products</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

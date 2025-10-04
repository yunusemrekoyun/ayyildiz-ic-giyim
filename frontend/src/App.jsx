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
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminSets from "./pages/admin/AdminSets";
import AdminCustomers from "./pages/admin/AdminCustomers";

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
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/media" element={<AdminMedia />} />
          <Route path="/admin/sets" element={<AdminSets />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

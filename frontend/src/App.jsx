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
import SetDetailsPage from "./pages/SetDetailsPage";
import CheckoutPage from "./pages/CheckoutPage";
import SuccesPage from "./pages/SuccessPage";
import RequireAuth from "./components/auth/RequireAuth";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminSets from "./pages/admin/AdminSets";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminSettings from "./pages/admin/AdminSettingsPage";
import AdminHeroManager from "./pages/admin/AdminHeroManager";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminDiscounts from "./pages/admin/AdminDiscounts";
import AdminCoupons from "./pages/admin/AdminCoupons";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LayoutSelector />}>
          {/* Public */}
          <Route index element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/sets" element={<SetsPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/account" element={<AuthSelector />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/set/:slug" element={<SetDetailsPage />} />

          {/* ✅ Checkout & Success korumalı */}
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/checkout/success"
            element={
              <RequireAuth>
                <SuccesPage />
              </RequireAuth>
            }
          />

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
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/discounts" element={<AdminDiscounts />} />
          <Route path="/admin/coupons" element={<AdminCoupons />} />
          <Route path="/admin/settings/hero" element={<AdminHeroManager />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

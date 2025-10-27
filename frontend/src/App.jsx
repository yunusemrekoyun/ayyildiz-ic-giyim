// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LayoutSelector from "./components/layout/LayoutSelector";
import LanguageGuard from "./components/routing/LanguageGuard.jsx";
import { DEFAULT_SITE_CODE } from "./constants/sites.js";

import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import SetsPage from "./pages/SetsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import SetDetailsPage from "./pages/SetDetailsPage";
import CartPage from "./pages/CartPage";
import AuthSelector from "./components/auth/AuthSelector";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FAQPage from "./pages/FAQPage";
import ShippingReturnsPage from "./pages/ShippingReturnsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";

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
import AdminOrders from "./pages/admin/AdminOrders";
import AdminDiscounts from "./pages/admin/AdminDiscounts";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminCampaignLayout from "./pages/admin/AdminCampaignLayout";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminSettings from "./pages/admin/AdminSettingsPage";
import AdminHeroManager from "./pages/admin/AdminHeroManager";
import AboutSettingsPage from "./pages/admin/AboutSettingsPage.jsx";
import TermsSettings from "./pages/admin/TermsSettings.jsx";
import PrivacyPolicySettings from "./pages/admin/PrivacyPolicySettings.jsx";
import ShippingReturnsSettings from "./pages/admin/ShippingReturnsSettings.jsx";
import AdminFaqSettingsPage from "./pages/admin/AdminFaqSettingsPage.jsx";
import AdminContactSettingsPage from "./pages/admin/AdminContactSettingsPage.jsx";
import ThemeSettingsPage from "./pages/ThemeSettingsPage.jsx";

// Utils
import ScrollToTop from "./components/ScrollToTop.jsx";
import { useThemeInit } from "./utils/theme";

export default function App() {
  // Apply active theme across storefront and admin
  useThemeInit();

  return (
    <BrowserRouter>
      <ScrollToTop />

      <Routes>
        <Route
          path="/"
          element={<Navigate to={`/${DEFAULT_SITE_CODE}`} replace />}
        />
        <Route
          path="/admin/*"
          element={<Navigate to={`/${DEFAULT_SITE_CODE}/admin/dashboard`} replace />}
        />
        <Route
          path="/account/*"
          element={<Navigate to={`/${DEFAULT_SITE_CODE}/account`} replace />}
        />

        <Route element={<LanguageGuard />}>
          <Route path="/:lng" element={<LayoutSelector />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="sets" element={<SetsPage />} />
            <Route path="product/:slug" element={<ProductDetailPage />} />
            <Route path="set/:slug" element={<SetDetailsPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="account" element={<AuthSelector />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="shipping-returns" element={<ShippingReturnsPage />} />
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="terms" element={<TermsPage />} />

            <Route
              path="checkout"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route
              path="checkout/success"
              element={
                <RequireAuth>
                  <SuccesPage />
                </RequireAuth>
              }
            />

            {/* Admin */}
            <Route path="admin" element={<Navigate to="admin/dashboard" replace />} />
            <Route path="admin/dashboard" element={<AdminDashboard />} />
            <Route path="admin/analytics" element={<AdminAnalytics />} />
            <Route path="admin/products" element={<AdminProducts />} />
            <Route path="admin/categories" element={<AdminCategories />} />
            <Route path="admin/media" element={<AdminMedia />} />
            <Route path="admin/sets" element={<AdminSets />} />
            <Route path="admin/customers" element={<AdminCustomers />} />
            <Route path="admin/orders" element={<AdminOrders />} />
            <Route path="admin/discounts" element={<AdminDiscounts />} />
            <Route path="admin/coupons" element={<AdminCoupons />} />
            <Route path="admin/campaigns/layout" element={<AdminCampaignLayout />} />
            <Route path="admin/campaigns" element={<AdminCampaigns />} />
            <Route path="admin/settings" element={<AdminSettings />} />
            <Route path="admin/settings/theme" element={<ThemeSettingsPage />} />
            <Route path="admin/settings/about" element={<AboutSettingsPage />} />
            <Route path="admin/settings/terms" element={<TermsSettings />} />
            <Route
              path="admin/settings/privacy"
              element={<PrivacyPolicySettings />}
            />
            <Route
              path="admin/settings/shipping-returns"
              element={<ShippingReturnsSettings />}
            />
            <Route path="admin/settings/faq" element={<AdminFaqSettingsPage />} />
            <Route
              path="admin/settings/contact"
              element={<AdminContactSettingsPage />}
            />
            <Route path="admin/settings/hero" element={<AdminHeroManager />} />
            <Route
              path="admin/settings/reviews"
              element={<AdminReviews />}
            />
          </Route>
        </Route>

        <Route
          path="*"
          element={<Navigate to={`/${DEFAULT_SITE_CODE}`} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import RootLayout from "./components/layout/RootLayout";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import SetsPage from "./pages/SetsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import AuthSelector from "./components/auth/AuthSelector";
import AboutPage from "./pages/AboutPage";

function LayoutRouteWrapper() {
  // Outlet kullanan layout route
  return (
    <RootLayout>
      <Outlet />
    </RootLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route element={<LayoutRouteWrapper />}>
          <Route index element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/sets" element={<SetsPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/account" element={<AuthSelector />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

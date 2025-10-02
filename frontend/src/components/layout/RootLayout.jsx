// src/components/layout/RootLayout.jsx
import Header from "./Header";
import Footer from "./Footer";

export default function RootLayout({ children }) {
  return (
    <div className="min-h-dvh bg-[rgb(221,236,229)]/60">
      {/* kart hissi */}
      <div className="mx-auto max-w-[1440px] overflow-visible rounded-[18px] bg-white shadow-sm">
        <Header />
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}

// src/components/footer/Footer.jsx
import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Üst mini ikonlar */}
        <div className="flex items-center justify-center gap-5 pb-6">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-light text-accent">
            <Mail className="h-5 w-5" />
          </span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-light text-accent">
            <Phone className="h-5 w-5" />
          </span>
        </div>

        {/* Linkler */}
        <nav className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[15px] font-medium text-primary">
          <Link to="/about" className="hover:text-accent">
            {t("footer.about")}
          </Link>
          <Link to="/contact" className="hover:text-accent">
            {t("footer.contact")}
          </Link>
          <Link to="/faq" className="hover:text-accent">
            {t("footer.faq")}
          </Link>
          <Link to="/shipping-returns" className="hover:text-accent">
            {t("footer.shippingReturns")}
          </Link>
          <Link to="/privacy" className="hover:text-accent">
            {t("footer.privacy")}
          </Link>
          <Link to="/terms" className="hover:text-accent">
            {t("footer.terms")}
          </Link>
        </nav>

        {/* Copyright */}
        <p className="pt-6 text-center text-sm text-secondary/70">
          {t("footer.rights", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}

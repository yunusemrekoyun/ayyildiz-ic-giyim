// src/components/footer/Footer.jsx
import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { useStaticTranslation } from "../../i18n/staticContent.js";

export default function Footer() {
  const t = useStaticTranslation();
  const links = t("footer.links") || {};
  const year = new Date().getFullYear();
  const copy = t("footer.copyright", { year }) || `© ${year} Ayyıldız İç Giyim.`;

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
            {links.about}
          </Link>
          <Link to="/contact" className="hover:text-accent">
            {links.contact}
          </Link>
          <Link to="/faq" className="hover:text-accent">
            {links.faq}
          </Link>
          <Link to="/shipping-returns" className="hover:text-accent">
            {links.shippingReturns}
          </Link>
          <Link to="/privacy" className="hover:text-accent">
            {links.privacy}
          </Link>
          <Link to="/terms" className="hover:text-accent">
            {links.terms}
          </Link>
        </nav>

        {/* Copyright */}
        <p className="pt-6 text-center text-sm text-secondary/70">
          {copy}
        </p>
      </div>
    </footer>
  );
}

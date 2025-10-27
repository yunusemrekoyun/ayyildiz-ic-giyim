import BreadCrumb from "../components/shop/BreadCrumb";
import Cart from "../components/cart/Cart";
import { useLocalizedPath } from "../hooks/useLocalizedPath.js";

export default function CartPage() {
  const { buildPath } = useLocalizedPath();
  return (
    <section className="bg-surface-light/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
        <BreadCrumb
          items={[{ label: "Home", to: buildPath("") }, { label: "Cart" }]}
        />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-16">
        <Cart />
      </div>
    </section>
  );
}

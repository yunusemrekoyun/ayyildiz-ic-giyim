import BreadCrumb from "../components/shop/BreadCrumb";
import Cart from "../components/cart/Cart";

export default function CartPage() {
  return (
    <section className="bg-surface-light/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
        <BreadCrumb items={[{ label: "Home", to: "/" }, { label: "Cart" }]} />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-16">
        <Cart />
      </div>
    </section>
  );
}

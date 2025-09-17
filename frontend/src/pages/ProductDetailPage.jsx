import BreadCrumb from "../components/shop/BreadCrumb";
import ProductDetail from "../components/product-detail/ProductDetail";
import SimilarProducts from "../components/product-detail/SimilarProducts";

export default function ProductDetailPage() {
  // Dummy data
  const product = {
    id: 101,
    title: "Luxury Silk Pajama Set",
    price: 129,
    oldPrice: 159,
    inStock: true,
    description:
      "Indulge in the ultimate comfort with our Luxury Silk Pajama Set. Crafted from the finest mulberry silk, this set offers a smooth, luxurious feel against your skin. Perfect for a restful night's sleep or a relaxing evening at home.",
    colors: ["#eadf7d", "#e4c6cf", "#a9b7d6"], // pastel swatch
    sizes: ["S", "M", "L", "XL"],
    images: ["/pd-1.jpg", "/pd-2.jpg", "/pd-3.jpg", "/pd-4.jpg"],
    fabric:
      "100% Mulberry Silk. Hand wash recommended. Do not bleach, iron on low heat.",
    details: [
      "V-Neckline",
      "Button Closure",
      "Lightweight & Breathable",
      "Country of Origin: Turkey",
    ],
  };

  const similar = [
    { id: 1, image: "/sp-1.jpg", title: "Elegant Lace Robe", price: "€89.00" },
    {
      id: 2,
      image: "/sp-2.jpg",
      title: "Soft Cotton Nightgown",
      price: "€69.00",
    },
    { id: 3, image: "/sp-3.jpg", title: "Satin Chemise", price: "€75.00" },
    { id: 4, image: "/sp-4.jpg", title: "Linen Bedding Set", price: "€249.00" },
  ];

  return (
    <section className="bg-surface-light/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
        <BreadCrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Lingerie", to: "/lingerie" },
            { label: product.title },
          ]}
        />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-12">
        <ProductDetail product={product} />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-16">
        <SimilarProducts items={similar} />
      </div>
    </section>
  );
}

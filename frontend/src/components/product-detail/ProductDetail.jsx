import { useState } from "react";

export default function ProductDetail({ product }) {
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [selColor, setSelColor] = useState(product.colors?.[0] ?? "");
  const [selSize, setSelSize] = useState(product.sizes?.[1] ?? "");

  const inc = () => setQty((q) => Math.min(99, q + 1));
  const dec = () => setQty((q) => Math.max(1, q - 1));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      {/* Left: Gallery */}
      <div className="md:col-span-5">
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <img
            src={product.images[activeImg]}
            alt={product.title}
            className="aspect-[4/5] w-full object-cover"
            draggable="false"
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          {product.images.slice(1).map((img, i) => (
            <button
              key={img}
              onClick={() => setActiveImg(i + 1)}
              className={`overflow-hidden rounded-lg border ${
                activeImg === i + 1 ? "border-accent" : "border-border"
              } bg-white`}
            >
              <img
                src={img}
                alt=""
                className="aspect-[4/5] w-full object-cover"
                draggable="false"
              />
            </button>
          ))}
        </div>

        {/* 360 View bar */}
        <div className="mt-4 rounded-lg border border-border bg-white px-4 py-2 text-sm text-secondary">
          <span className="mr-2">🌀</span> 360° View
        </div>
      </div>

      {/* Right: Info */}
      <div className="md:col-span-7">
        <div className="rounded-xl border border-border bg-contact-bg p-6">
          <h1 className="font-serif text-3xl font-extrabold text-primary">
            {product.title}
          </h1>

          {/* Prices + stock */}
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xl font-semibold text-accent">
              €{product.price}
            </span>
            <span className="text-secondary/60 line-through">
              €{product.oldPrice}
            </span>
          </div>
          {product.inStock && (
            <p className="mt-1 text-sm text-accent">
              <span className="mr-1">●</span> In Stock
            </p>
          )}

          {/* Description */}
          <p className="mt-4 max-w-prose leading-relaxed text-secondary">
            {product.description}
          </p>

          {/* Color */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-primary">Color</p>
            <div className="flex items-center gap-3">
              {product.colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelColor(c)}
                  className={`grid h-8 w-8 place-items-center rounded-full ring-2 transition ${
                    selColor === c ? "ring-accent" : "ring-border"
                  }`}
                  aria-label={c}
                >
                  <span
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-primary">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelSize(s)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm",
                    selSize === s
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-white text-primary hover:bg-surface-hover",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Qty + CTA */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5">
              <button onClick={dec} className="px-1 text-primary">
                –
              </button>
              <span className="w-6 text-center text-primary">{qty}</span>
              <button onClick={inc} className="px-1 text-primary">
                +
              </button>
            </div>

            <button className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-hover md:flex-none md:px-8">
              Add to Cart
            </button>
          </div>

          {/* Fabric & Care */}
          <div className="mt-6">
            <h3 className="mb-1 font-semibold text-primary">
              Fabric &amp; Care
            </h3>
            <p className="text-sm text-secondary">{product.fabric}</p>
          </div>

          {/* Details (bullets) */}
          <div className="mt-4">
            <h3 className="mb-1 font-semibold text-primary">Details</h3>
            <ul className="list-disc pl-5 text-sm text-secondary">
              {product.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>

          {/* Share */}
          <div className="mt-6 flex items-center gap-3 text-sm">
            <span className="text-primary font-semibold">Share:</span>
            <a className="text-secondary hover:text-accent" href="#">
              Facebook
            </a>
            <a className="text-secondary hover:text-accent" href="#">
              Pinterest
            </a>
            <a className="text-secondary hover:text-accent" href="#">
              Twitter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

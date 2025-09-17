// src/components/hero/Hero.jsx
import { useState } from "react";

export default function Hero({
  images = ["/hero-1.jpg", "/hero-2.jpg", "/hero-3.jpg", "/hero-4.jpg"],
  title = "Celebrate Your Moments in Style",
  subtitle = "Discover our exclusive collection of lingerie and home textiles for your most precious memories.",
  ctaText = "Shop New Arrivals",
  onCta = () => {},
}) {
  const [index, setIndex] = useState(0);

  return (
    // Kesin yükseklik: küçük ekranda ~70vh, md+ için (header 64px çıkarılmış) tam ekran hissi
    <section className="relative w-full min-h-[520px] h-[70vh] md:h-[calc(100vh-4rem)]">
      {/* Arka plan görsel */}
      <img
        src={images[index]}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable="false"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

      {/* İçerik → alt orta hizası */}
      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-end px-6 text-center pb-24 md:pb-32">
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white drop-shadow md:text-5xl lg:text-6xl">
          {title}
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85 drop-shadow md:text-lg">
          {subtitle}
        </p>

        <button
          onClick={onCta}
          className="mt-8 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white shadow hover:bg-accent-hover transition"
        >
          {ctaText}
        </button>
      </div>

      {/* Slider noktaları */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={[
              "h-2.5 w-2.5 rounded-full transition",
              i === index
                ? "scale-110 bg-white"
                : "bg-white/70 hover:bg-white/90",
            ].join(" ")}
          />
        ))}
      </div>
    </section>
  );
}

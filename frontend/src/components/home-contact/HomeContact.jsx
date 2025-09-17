// src/components/home-contact/HomeContact.jsx
export default function HomeContact({
  title = "Visit Our Store",
  description = `Experience our collections in person at our flagship store in Berlin. Our friendly staff will be delighted to assist you in finding the perfect pieces for your trousseau.`,
  storeName = "Evim & Stil Berlin",
  address = "Kurfürstendamm 123, 10711 Berlin, Germany",
  hours = [
    { k: "Mon - Sat", v: "10:00 - 20:00" },
    { k: "Sun", v: "Closed" },
  ],
  mapSrc = "https://www.google.com/maps?q=Kurfürstendamm%20123%2C%20Berlin&output=embed",
}) {
  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-6 py-14">
      <h2 className="mb-8 text-center font-serif text-3xl font-bold tracking-tight text-primary">
        {title}
      </h2>

      <div className="rounded-xl bg-contact-bg p-6 shadow-sm ring-1 ring-black/5">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          {/* Map */}
          <div className="rounded-xl bg-white p-1 shadow-md ring-1 ring-black/5">
            <iframe
              title="store-location"
              src={mapSrc}
              className="h-[360px] w-full rounded-lg"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Text block */}
          <div className="text-primary">
            <p className="mb-5 max-w-prose leading-relaxed text-secondary">
              {description}
            </p>

            <p className="font-semibold">{storeName}</p>
            <p className="mb-5">{address}</p>

            <p className="font-semibold">Opening Hours:</p>
            <ul className="mt-1 space-y-1 text-secondary">
              {hours.map((h) => (
                <li key={h.k}>
                  {h.k}: <span className="font-medium text-primary">{h.v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

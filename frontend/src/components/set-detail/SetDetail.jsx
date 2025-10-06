// src/components/set-detail/SetDetail.jsx
import { useMemo, useState } from "react";
import SetGallery from "./SetGallery";
import SetInfo from "./SetInfo";
import SetIncludes from "./SetIncludes";
import SetSummary from "./SetSummary";

export default function SetDetail({ setDoc }) {
  // Hook'lar her zaman çağrılıyor (ESLint hatası çözümü)
  const [qty, setQty] = useState(1);

  // setDoc olmasa da güvenli hesaplama
  const maxStock = useMemo(() => {
    const s = Number(setDoc?.stock);
    return Number.isFinite(s) && s > 0 ? s : 99;
  }, [setDoc?.stock]);

  // setDoc yoksa hiçbir şey çizme (hook'lardan SONRA koşullu return)
  if (!setDoc) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-12">
      {/* Left: Gallery */}
      <div className="md:col-span-5">
        <SetGallery images={setDoc.images || []} title={setDoc.name} />
      </div>

      {/* Right: Info */}
      <div className="md:col-span-7">
        <div className="space-y-5 rounded-xl bg-white p-5 ring-1 ring-black/5 md:p-6">
          <SetInfo
            name={setDoc.name}
            price={setDoc.price}
            stock={setDoc.stock}
            description={setDoc.description}
          />

          <SetIncludes products={setDoc.products || []} />

          <SetSummary
            setDoc={setDoc}
            price={setDoc.price}
            stock={setDoc.stock}
            quantity={qty}
            maxStock={maxStock}
            onChangeQuantity={setQty}
          />
        </div>
      </div>
    </div>
  );
}

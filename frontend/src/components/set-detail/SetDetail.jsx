import { useMemo, useState, useEffect } from "react";
import SetGallery from "./SetGallery";
import SetInfo from "./SetInfo";
import SetIncludes from "./SetIncludes";
import SetSummary from "./SetSummary";
import { Heart } from "lucide-react";
import { getAccessToken } from "../../api/client";
import { userDetailsApi } from "../../api/userDetails";
import { useNavigate } from "react-router-dom";

export default function SetDetail({ setDoc }) {
  // Hook'lar her zaman çağrılıyor (ESLint hatası çözümü)
  const [qty, setQty] = useState(1);
  const [isFav, setIsFav] = useState(false);
  const navigate = useNavigate();

  // setDoc olmasa da güvenli hesaplama
  const maxStock = useMemo(() => {
    const s = Number(setDoc?.stock);
    return Number.isFinite(s) && s > 0 ? s : 99;
  }, [setDoc?.stock]);

  // Favori durumu yükle
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!setDoc?.id) return;
      if (!getAccessToken()) {
        if (mounted) setIsFav(false);
        return;
      }
      try {
        const favs = await userDetailsApi.favorites();
        const ids = new Set((favs.sets || []).map((s) => s.id || s._id || s));
        if (mounted) setIsFav(ids.has(setDoc.id));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setDoc?.id]);

  const toggleFav = async () => {
    if (!setDoc?.id) return;
    if (!getAccessToken()) {
      navigate("/auth");
      return;
    }
    try {
      await userDetailsApi.toggleFavorite({ type: "set", id: setDoc.id });
      setIsFav((v) => !v);
    } catch (e) {
      console.error(e);
    }
  };

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
          {/* Üst sağ: Favori kalbi */}
          <div className="flex items-start justify-between">
            <div />
            <button
              type="button"
              onClick={toggleFav}
              aria-pressed={isFav}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              className={[
                "inline-flex items-center justify-center rounded-full border px-3 py-2",
                isFav
                  ? "border-accent text-accent bg-white"
                  : "border-border text-secondary hover:bg-surface-hover",
              ].join(" ")}
              title={isFav ? "Favorilerden kaldır" : "Favorilere ekle"}
            >
              <Heart
                className="h-5 w-5"
                {...(isFav ? { fill: "currentColor" } : {})}
              />
            </button>
          </div>

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

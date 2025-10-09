import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BreadCrumb from "../components/shop/BreadCrumb";
import SetsSets from "../components/sets-sets/SetsSets";
import { setApi } from "../api/sets";
import { campaignApi } from "../api/campaigns";

export default function SetsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [campaignContext, setCampaignContext] = useState(null);
  const [campaignError, setCampaignError] = useState("");

  const campaignId = searchParams.get("campaign");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        if (campaignContext?.items) {
          const mapped = mapSetsToCards(campaignContext.items);
          if (mounted) setItems(mapped);
        } else {
          let res = await setApi.list();
          let sets = normalizeSetsResponse(res);

          if (!sets.length) {
            const res2 = await setApi.list({ includeHidden: true });
            sets = normalizeSetsResponse(res2);
          }

          const mapped = mapSetsToCards(sets);
          if (mounted) setItems(mapped);
        }
      } catch (e) {
        console.error("SETS PAGE - fetch error:", e);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [campaignContext]);

  useEffect(() => {
    if (!campaignId) {
      setCampaignContext(null);
      setCampaignError("");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setCampaignError("");
        const data = await campaignApi.resolve(campaignId);
        if (!mounted) return;
        if (data.targetType === "PRODUCTS") {
          navigate(`/shop?campaign=${campaignId}`, { replace: true });
          return;
        }
        setCampaignContext(data);
      } catch (e) {
        if (!mounted) return;
        setCampaignContext(null);
        setCampaignError(extractMessage(e));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [campaignId, navigate]);

  const tabs = useMemo(() => {
    const tagSet = new Set();
    for (const s of items) (s.tags || []).forEach((t) => tagSet.add(String(t)));
    return ["All", ...Array.from(tagSet)];
  }, [items]);

  const activeCampaign = campaignContext?.campaign || null;

  const handleClearCampaign = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("campaign");
    setSearchParams(params);
  };

  return (
    <>
      <section className="border-b border-border bg-surface-light/60">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
          <BreadCrumb
            items={[
              { label: "Home", to: "/" },
              { label: "Trousseau Packages" },
            ]}
          />
          <div className="mt-4 text-center">
            <h1 className="text-4xl font-serif font-extrabold tracking-tight text-primary">
              Trousseau Packages
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-secondary">
              Curated collections for your perfect wedding trousseau — discover
              elegant bridal, bedroom and bathroom packages crafted to match
              your style.
            </p>
          </div>
        </div>
      </section>

      {campaignError && (
        <div className="mx-auto mt-6 max-w-[1400px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{campaignError}</span>
            <button
              type="button"
              onClick={handleClearCampaign}
              className="text-rose-700 underline underline-offset-4 hover:text-rose-800"
            >
              Clear campaign filter
            </button>
          </div>
        </div>
      )}

      {activeCampaign && !campaignError && (
        <div className="mx-auto mt-6 max-w-[1400px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            <div>
              Showing campaign <span className="font-semibold">“{activeCampaign.name}”</span>
              {activeCampaign.description
                ? ` — ${activeCampaign.description}`
                : ""}
            </div>
            <button
              type="button"
              onClick={handleClearCampaign}
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <SetsSets
        title="Explore the Collections"
        subtitle="Use the filters to browse our Bridal, Bedroom and Bathroom packages."
        tabs={tabs}
        items={items}
        loading={loading}
      />

      <section className="mx-auto mb-12 max-w-[1400px] px-4 sm:px-6">
        <div className="rounded-xl border border-border bg-contact-bg p-6 text-center">
          <h3 className="text-xl font-semibold text-primary">
            Need help choosing a set?
          </h3>
          <p className="mt-1 text-secondary">
            Our stylists can help you build the perfect trousseau package.
          </p>
          <div className="mt-4">
            <a
              href="/contact"
              className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Talk to a Stylist
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

/** Response’u esnek şekilde normalize et */
function normalizeSetsResponse(res) {
  // Bazı client’larda res direkt dizi olabilir; bazılarında { sets }, bazılarında { data: { sets } }
  const maybe = res?.sets || res?.data?.sets || res;
  return Array.isArray(maybe) ? maybe : [];
}

/** backend set -> kart */
function mapSetsToCards(sets) {
  return (sets || []).map((s) => {
    const image = s?.images?.[0]?.url || "/set-placeholder.jpg";
    const title = s?.name || "Untitled Set";
    const desc = s?.description || "";

    const productNames = (s?.products || [])
      .map((p) => p?.product?.name)
      .filter(Boolean);

    const includes =
      productNames.length > 0
        ? productNames.slice(0, 3).join(", ") +
          (productNames.length > 3 ? ` +${productNames.length - 3}` : "")
        : "";

    const tags = Array.from(
      new Set(
        (s?.products || [])
          .map((p) => p?.product?.category?.name)
          .filter(Boolean)
      )
    );

    const slugOrId = s?.slug || s?.id || s?._id;
    const to = slugOrId ? `/set/${slugOrId}` : "#";

    const price = Number(s?.price ?? 0);
    const finalPrice = Number(s?.finalPrice ?? price);
    const discount = s?.discount?.percentage;

    return { image, title, desc, includes, tags, to, price, finalPrice, discount };
  });
}

function extractMessage(error) {
  if (!error) return "Unexpected error";
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch {
      /* ignore */
    }
    return error.message;
  }
  return String(error);
}

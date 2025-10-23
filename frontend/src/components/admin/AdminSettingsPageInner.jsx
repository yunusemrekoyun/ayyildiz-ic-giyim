import { useEffect, useMemo, useState } from "react";
import { heroApi } from "../../api/heroes";
import { campaignApi } from "../../api/campaigns";
import ShippingSettingsCard from "./settings/ShippingSettingsCard.jsx";
import ReviewSettingsCard from "./settings/ReviewSettingsCard.jsx";
import { Link } from "react-router-dom";
import {
  Wand2,
  ArrowRight,
  Image as ImageIcon,
  Video,
  Palette,
  Megaphone,
  FileText,
  Mail,
  HelpCircle,
  Truck, // 🔹 eklendi
  ShieldCheck,
} from "lucide-react";

export default function AdminSettingsPageInner() {
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const topHero = useMemo(
    () =>
      [...heroes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0] ||
      null,
    [heroes]
  );

  const topCampaign = useMemo(
    () =>
      [...campaigns].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      )[0] || null,
    [campaigns]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [heroList, campaignList] = await Promise.all([
          heroApi.list({ includeInactive: true }),
          campaignApi.listManage({ includeInactive: true }),
        ]);
        if (!mounted) return;
        setHeroes(heroList);
        setCampaigns(campaignList);
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingCampaigns(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
          {/* ----- Header ----- */}
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs text-[var(--color-text-admin-muted)]">
              <Wand2 className="h-4 w-4" />
              Global Settings
            </div>
            <h2 className="text-2xl font-semibold">
              Site Settings & Content Blocks
            </h2>
            <p className="text-sm text-[var(--color-text-admin-muted)]">
              Manage hero banners, about & contact pages, campaigns, and global
              content.
            </p>
          </div>

          {/* ----- Main Cards Grid ----- */}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* --- HERO --- */}
            <Link
              to="/admin/settings/hero"
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] hover:bg-[var(--color-bg-card)] transition-colors"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-card)]">
                {loading ? (
                  <div className="h-full w-full animate-pulse bg-[var(--color-bg-hover)]" />
                ) : topHero ? (
                  topHero.image ? (
                    <img
                      src={topHero.image.url}
                      alt={topHero.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : topHero.video ? (
                    <video
                      className="h-full w-full object-cover"
                      src={topHero.video.url}
                      muted
                      playsInline
                      autoPlay
                      loop
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                      No media
                    </div>
                  )
                ) : (
                  <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                    No heroes yet
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                {topHero && (
                  <div className="absolute bottom-0 left-0 p-4 text-white">
                    <div className="text-lg font-semibold line-clamp-1">
                      {topHero.title}
                    </div>
                    <div className="text-xs opacity-90 line-clamp-2">
                      {topHero.subtitle}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    {topHero?.video ? (
                      <Video className="h-5 w-5 text-white/90" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-white/90" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">Home Hero</div>
                    <div className="text-xs text-[var(--color-text-admin-muted)]">
                      {heroes.length
                        ? `${heroes.length} slide • top: ${
                            topHero?.title || "—"
                          }`
                        : "Create your first hero"}
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-[var(--color-border-admin)] p-2 group-hover:bg-[var(--color-bg-hover)]">
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
                </div>
              </div>
            </Link>

            {/* --- CAMPAIGNS --- */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] transition-colors">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-card)]">
                {loadingCampaigns ? (
                  <div className="h-full w-full animate-pulse bg-[var(--color-bg-hover)]" />
                ) : topCampaign ? (
                  topCampaign.image ? (
                    <img
                      src={topCampaign.image.url}
                      alt={topCampaign.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                      No image
                    </div>
                  )
                ) : (
                  <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                    No campaigns yet
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                {topCampaign && (
                  <div className="absolute bottom-0 left-0 p-4 text-white">
                    <div className="text-lg font-semibold line-clamp-1">
                      {topCampaign.name}
                    </div>
                    <div className="text-xs opacity-90 line-clamp-2">
                      {topCampaign.description || ""}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    <Megaphone className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <div className="font-semibold">Home Campaigns</div>
                    <div className="text-xs text-[var(--color-text-admin-muted)]">
                      {campaigns.length
                        ? `${campaigns.length} total • top: ${
                            topCampaign?.name || "—"
                          }`
                        : "Create your first campaign"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/admin/campaigns"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
                  >
                    Manage
                  </Link>
                  <Link
                    to="/admin/campaigns/layout"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--color-text-admin)] px-4 py-2 text-xs font-semibold text-[var(--color-bg-admin)] hover:opacity-90"
                  >
                    Layout
                  </Link>
                </div>
              </div>
            </div>

            {/* --- ABOUT PAGE SETTINGS --- */}
            <Link
              to="/admin/settings/about"
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] hover:bg-[var(--color-bg-card)] transition-colors"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-card)]">
                <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    <Wand2 className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <div className="font-semibold">About Page Content</div>
                    <div className="text-xs text-[var(--color-text-admin-muted)]">
                      Manage story, values, stats and hero visuals
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-[var(--color-border-admin)] p-2 group-hover:bg-[var(--color-bg-hover)]">
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
                </div>
              </div>
            </Link>

            {/* --- CONTACT PAGE SETTINGS --- */}
            <Link
              to="/admin/settings/contact"
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] hover:bg-[var(--color-bg-card)] transition-colors"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-card)]">
                <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    <Mail className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <div className="font-semibold">Contact Page Content</div>
                    <div className="text-xs text-[var(--color-text-admin-muted)]">
                      Manage contact info, working hours and form behavior
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-[var(--color-border-admin)] p-2 group-hover:bg-[var(--color-bg-hover)]">
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
                </div>
              </div>
            </Link>

            {/* --- FAQ PAGE SETTINGS --- */}
            <Link
              to="/admin/settings/faq"
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] hover:bg-[var(--color-bg-card)] transition-colors"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-card)]">
                <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    <HelpCircle className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <div className="font-semibold">FAQ Page Content</div>
                    <div className="text-xs text-[var(--color-text-admin-muted)]">
                      Manage FAQ sections, questions and answers
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-[var(--color-border-admin)] p-2 group-hover:bg-[var(--color-bg-hover)]">
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
                </div>
              </div>
            </Link>

            {/* --- SHIPPING & RETURNS PAGE SETTINGS --- */}
            <Link
              to="/admin/settings/shipping-returns"
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] hover:bg-[var(--color-bg-card)] transition-colors"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-card)]">
                <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                  <Truck className="h-6 w-6" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    <Truck className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      Shipping & Returns Content
                    </div>
                    <div className="text-xs text-[var(--color-text-admin-muted)]">
                      Manage shipping destinations, rates, returns & sidebar
                      info
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-[var(--color-border-admin)] p-2 group-hover:bg-[var(--color-bg-hover)]">
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
                </div>
              </div>
            </Link>
            {/* --- PRIVACY POLICY PAGE SETTINGS --- */}
            <Link
              to="/admin/settings/privacy"
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] hover:bg-[var(--color-bg-card)] transition-colors"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-card)]">
                <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    <ShieldCheck className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <div className="font-semibold">Privacy Policy Content</div>
                    <div className="text-xs text-[var(--color-text-admin-muted)]">
                      Manage sections, anchors and footer notice
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-[var(--color-border-admin)] p-2 group-hover:bg-[var(--color-bg-hover)]">
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
                </div>
              </div>
            </Link>

            {/* --- TERMS OF SERVICE PAGE SETTINGS --- */}
            <Link
              to="/admin/settings/terms"
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] hover:bg-[var(--color-bg-card)] transition-colors"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-card)]">
                <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    <FileText className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      Terms of Service Content
                    </div>
                    <div className="text-xs text-[var(--color-text-admin-muted)]">
                      Manage sections, clauses and footer note
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-[var(--color-border-admin)] p-2 group-hover:bg-[var(--color-bg-hover)]">
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
                </div>
              </div>
            </Link>
            {/* --- Shipping & Review small cards (legacy settings) --- */}
            <ShippingSettingsCard />
            <ReviewSettingsCard />

            {/* --- THEME COLORS (placeholder) --- */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)]">
              <div className="flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                  <Palette className="h-5 w-5 text-white/90" />
                </div>
                <div>
                  <div className="font-semibold">Theme & Colors</div>
                  <div className="text-xs text-[var(--color-text-admin-muted)]">
                    (soon) Adjust palette tokens
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="h-32 rounded-xl border border-dashed border-[var(--color-border-admin)]/50 bg-[var(--color-bg-card)]/40" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----- Tips Sidebar ----- */}
      <aside className="xl:col-span-4">
        <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
          <h3 className="text-lg font-semibold">Tips</h3>
          <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-admin-muted)]">
            <li>Prefer short, optimized videos for hero.</li>
            <li>Button text is optional; keep hero clean.</li>
            <li>Target can be full shop or specific categories.</li>
            <li>Use sort order to define slide sequence.</li>
            <li>Manage About, Contact, FAQ and Shipping pages for clarity.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

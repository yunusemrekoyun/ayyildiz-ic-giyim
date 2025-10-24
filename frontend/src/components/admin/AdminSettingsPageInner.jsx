// src/components/admin/AdminSettingsPageInner.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { heroApi } from "../../api/heroes";
import { campaignApi } from "../../api/campaigns";
import ShippingSettingsCard from "./settings/ShippingSettingsCard.jsx";
import ReviewSettingsCard from "./settings/ReviewSettingsCard.jsx";
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
  Truck,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

function SectionBlock({ title, subtitle, children }) {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
    </section>
  );
}

function SettingsCard({
  to,
  icon: Icon,
  mediaIcon: MediaIcon,
  mediaImage,
  mediaAlt = "",
  title,
  description,
  footer,
  media,
  loading = false,
}) {
  const Wrapper = to ? Link : "div";
  const wrapperProps = to ? { to } : {};

  const cover = loading ? (
    <div className="h-full w-full animate-pulse bg-[var(--color-bg-hover)]" />
  ) : media ? (
    media
  ) : mediaImage ? (
    <img
      src={mediaImage}
      alt={mediaAlt || title}
      className="h-full w-full object-cover"
    />
  ) : MediaIcon ? (
    <div className="relative h-full w-full bg-gradient-to-br from-[var(--color-surface-light)] via-[var(--color-surface)] to-[var(--color-surface-hover)]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid h-24 w-24 place-items-center rounded-2xl bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/30 backdrop-blur-md">
          <MediaIcon className="h-12 w-12 text-[var(--color-accent)]" />
        </div>
      </div>
    </div>
  ) : (
    <div className="grid h-full place-items-center text-[var(--color-text-admin-muted)]">
      <LayoutDashboard className="h-6 w-6" />
    </div>
  );

  return (
    <Wrapper
      {...wrapperProps}
      className={[
        "group relative overflow-hidden rounded-2xl border",
        "border-[var(--color-border-admin)]",
        to
          ? "bg-[var(--color-bg-admin)] hover:bg-[var(--color-bg-card)] transition-colors"
          : "bg-[var(--color-bg-admin)]",
      ].join(" ")}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {cover}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
      </div>

      {/* Body */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/30">
            {Icon ? (
              <Icon className="h-6 w-6 text-[var(--color-accent)]" />
            ) : (
              <Wand2 className="h-6 w-6 text-[var(--color-accent)]" />
            )}
          </div>
          <div>
            <div className="font-semibold text-[var(--color-text-admin)]">
              {title}
            </div>
            {description && (
              <div className="text-xs text-[var(--color-text-admin-muted)]">
                {description}
              </div>
            )}
          </div>
        </div>

        {to && (
          <div className="rounded-full border border-[var(--color-border-admin)] p-2 group-hover:bg-[var(--color-bg-hover)]">
            <ArrowRight className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
          </div>
        )}
      </div>

      {footer && <div className="px-4 pb-4">{footer}</div>}
    </Wrapper>
  );
}

/* ------------------------------------------------------------------ */
export default function AdminSettingsPageInner() {
  const [heroes, setHeroes] = useState([]);
  const [loadingHeroes, setLoadingHeroes] = useState(true);
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
          setLoadingHeroes(false);
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
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs text-[var(--color-text-admin-muted)]">
              <Wand2 className="h-4 w-4" />
              Global Settings
            </div>
            <h2 className="text-2xl font-semibold">
              Site Settings & Content Blocks
            </h2>
            <p className="text-sm text-[var(--color-text-admin-muted)]">
              Manage hero banners, page contents, campaigns, policies and quick
              settings.
            </p>
          </div>

          {/* --- Categories --- */}
          <SectionBlock
            title="Home & Marketing"
            subtitle="Hero ve kampanya içeriklerini yönetin."
          >
            <SettingsCard
              to="/admin/settings/hero"
              icon={topHero?.video ? Video : ImageIcon}
              mediaImage={
                !loadingHeroes && topHero?.image?.url
                  ? topHero.image.url
                  : undefined
              }
              mediaIcon={
                !loadingHeroes && !topHero?.image?.url
                  ? topHero?.video
                    ? Video
                    : ImageIcon
                  : undefined
              }
              mediaAlt={topHero?.title || "Home Hero"}
              title="Home Hero"
              description={
                heroes.length
                  ? `${heroes.length} slide • top: ${topHero?.title || "—"}`
                  : "Create your first hero"
              }
              loading={loadingHeroes}
            />

            <SettingsCard
              to="/admin/campaigns"
              icon={Megaphone}
              mediaImage={
                !loadingCampaigns && topCampaign?.image?.url
                  ? topCampaign.image.url
                  : undefined
              }
              mediaIcon={
                !loadingCampaigns && !topCampaign?.image?.url
                  ? Megaphone
                  : undefined
              }
              mediaAlt={topCampaign?.name || "Home Campaigns"}
              title="Home Campaigns"
              description={
                campaigns.length
                  ? `${campaigns.length} total • top: ${
                      topCampaign?.name || "—"
                    }`
                  : "Create your first campaign"
              }
              loading={loadingCampaigns}
            />
          </SectionBlock>

          <SectionBlock
            title="Pages"
            subtitle="Statik sayfa içeriklerini düzenleyin."
          >
            <SettingsCard
              to="/admin/settings/about"
              icon={FileText}
              mediaIcon={FileText}
              title="About Page Content"
            />
            <SettingsCard
              to="/admin/settings/contact"
              icon={Mail}
              mediaIcon={Mail}
              title="Contact Page Content"
            />
            <SettingsCard
              to="/admin/settings/faq"
              icon={HelpCircle}
              mediaIcon={HelpCircle}
              title="FAQ Page Content"
            />
            <SettingsCard
              to="/admin/settings/shipping-returns"
              icon={Truck}
              mediaIcon={Truck}
              title="Shipping & Returns"
            />
          </SectionBlock>

          <SectionBlock title="Policies" subtitle="Yasal metinleri yönetin.">
            <SettingsCard
              to="/admin/settings/privacy"
              icon={ShieldCheck}
              mediaIcon={ShieldCheck}
              title="Privacy Policy"
            />
            <SettingsCard
              to="/admin/settings/terms"
              icon={FileText}
              mediaIcon={FileText}
              title="Terms of Service"
            />
          </SectionBlock>

          <SectionBlock
            title="Quick & Legacy Settings"
            subtitle="Geçiş dönemine ait küçük ayarlar."
          >
            <div className="col-span-1 md:col-span-2">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <ShippingSettingsCard />
                <ReviewSettingsCard />
              </div>
            </div>
          </SectionBlock>

          <SectionBlock
            title="Appearance"
            subtitle="Tema ve renkler (yakında)."
          >
            <SettingsCard
              icon={Palette}
              mediaIcon={Palette}
              title="Theme & Colors"
              description="(soon) Adjust palette tokens"
            />
          </SectionBlock>
        </div>
      </div>

      {/* Tips Sidebar */}
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

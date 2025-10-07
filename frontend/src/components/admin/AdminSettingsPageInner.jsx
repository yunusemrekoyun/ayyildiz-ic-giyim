import { useEffect, useMemo, useState } from "react";
import { heroApi } from "../../api";
import { Link } from "react-router-dom";
import {
  Wand2,
  ArrowRight,
  Image as ImageIcon,
  Video,
  Palette,
} from "lucide-react";

export default function AdminSettingsPageInner() {
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);

  const topHero = useMemo(
    () =>
      [...heroes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0] ||
      null,
    [heroes]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await heroApi.list({ includeInactive: true });
        if (!mounted) return;
        setHeroes(list);
      } finally {
        if (mounted) setLoading(false);
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
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs text-[var(--color-text-admin-muted)]">
              <Wand2 className="h-4 w-4" />
              Global Settings
            </div>
            <h2 className="text-2xl font-semibold">
              Site Settings & Content Blocks
            </h2>
            <p className="text-sm text-[var(--color-text-admin-muted)]">
              Manage hero banners, theme and other global content.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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

      <aside className="xl:col-span-4">
        <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
          <h3 className="text-lg font-semibold">Tips</h3>
          <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-admin-muted)]">
            <li>Prefer short, optimized videos for hero.</li>
            <li>Button text is optional; keep hero clean.</li>
            <li>Target can be full shop or specific categories.</li>
            <li>Use sort order to define slide sequence.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

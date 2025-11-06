// src/pages/admin/settings/AboutSettingsPage.jsx
import { useEffect, useState } from "react";
import { aboutApi } from "../../api/about";
import { Loader2, Save, Image as ImageIcon, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminLang } from "../../context/LangContext.jsx";

export default function AboutSettingsPage() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState({});
  const { adminLang } = useAdminLang();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setFiles({});
    (async () => {
      try {
        const res = await aboutApi.get(adminLang);
        if (mounted) setData(res.about);
      } catch (err) {
        if (mounted) toast.error(err?.message || "Veri yüklenemedi");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [adminLang]);

  if (loading)
    return (
      <div className="flex h-96 items-center justify-center text-[var(--color-text-admin-muted)]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  const handleInput = (key, value) => setData((p) => ({ ...p, [key]: value }));

  const handleFile = (key, file) => {
    setFiles((f) => ({ ...f, [key]: file }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      Object.entries(data || {}).forEach(([k, v]) => {
        if (Array.isArray(v) || typeof v === "object") {
          form.append(k, JSON.stringify(v));
        } else {
          form.append(k, v ?? "");
        }
      });
      Object.entries(files).forEach(([k, file]) => {
        if (file) form.append(k, file);
      });

      const res = await aboutApi.update(form, adminLang);
      setData(res.about);
      toast.success("Hakkımızda sayfası güncellendi");
    } catch (err) {
      toast.error(err.message || "Kaydedilirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
          Hakkımızda Sayfası İçeriği
        </h1>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-text-admin)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-admin)] hover:opacity-90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          Kaydet
        </button>
      </div>

      {/* HERO SECTION */}
      <SectionCard title="Hero Bölümü">
        <TextInput
          label="Hero Başlığı"
          value={data.heroTitle}
          onChange={(v) => handleInput("heroTitle", v)}
        />
        <TextArea
          label="Hero Alt Başlık"
          value={data.heroSubtitle}
          onChange={(v) => handleInput("heroSubtitle", v)}
        />
        <ImageUpload
          label="Hero Görseli"
          current={data.heroImage?.url}
          onChange={(f) => handleFile("heroImage", f)}
        />
      </SectionCard>

      {/* STORY / VALUES */}
      <SectionCard title="Hikaye, Vizyon ve Değerler">
        {data.dotBlocks.map((b, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border-admin)] p-4 mb-4 bg-[var(--color-bg-card)]"
          >
            <TextInput
              label="Başlık"
              value={b.title}
              onChange={(v) =>
                handleInput("dotBlocks", [
                  ...data.dotBlocks.map((x, idx) =>
                    idx === i ? { ...x, title: v } : x
                  ),
                ])
              }
            />
            <TextArea
              label="Metin"
              value={b.text}
              onChange={(v) =>
                handleInput("dotBlocks", [
                  ...data.dotBlocks.map((x, idx) =>
                    idx === i ? { ...x, text: v } : x
                  ),
                ])
              }
            />
          </div>
        ))}
        <ImageUpload
          label="Sol Görsel"
          current={data.leftImage?.url}
          onChange={(f) => handleFile("leftImage", f)}
        />
      </SectionCard>

      {/* STATS */}
      <SectionCard title="İstatistikler / Rozetler">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.stats.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4"
            >
              <TextInput
                label="Değer"
                value={s.value}
                onChange={(v) =>
                  handleInput(
                    "stats",
                    data.stats.map((x, idx) =>
                      idx === i ? { ...x, value: v } : x
                    )
                  )
                }
              />
              <TextInput
                label="Etiket"
                value={s.label}
                onChange={(v) =>
                  handleInput(
                    "stats",
                    data.stats.map((x, idx) =>
                      idx === i ? { ...x, label: v } : x
                    )
                  )
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* MATERIALS */}
      <SectionCard title="Materyaller ve Sorumluluk">
        <TextInput
          label="Başlık"
          value={data.materialsTitle}
          onChange={(v) => handleInput("materialsTitle", v)}
        />
        <TextArea
          label="Metin"
          value={data.materialsText}
          onChange={(v) => handleInput("materialsText", v)}
        />
        <ImageUpload
          label="Materyaller Görseli"
          current={data.materialsImage?.url}
          onChange={(f) => handleFile("materialsImage", f)}
        />
      </SectionCard>

      {/* CTA */}
      <SectionCard title="Eyleme Çağrı (CTA)">
        <TextInput
          label="Başlık"
          value={data.ctaTitle}
          onChange={(v) => handleInput("ctaTitle", v)}
        />
        <TextArea
          label="Alt Başlık"
          value={data.ctaSubtitle}
          onChange={(v) => handleInput("ctaSubtitle", v)}
        />
      </SectionCard>
    </div>
  );
}

/* ---------- Small reusable UI bits ---------- */

function SectionCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-admin)] mb-4">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--color-text-admin)]">
        {label}
      </span>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--color-text-admin)]">
        {label}
      </span>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      />
    </label>
  );
}

function ImageUpload({ label, current, onChange }) {
  return (
    <div>
      <span className="text-sm font-medium text-[var(--color-text-admin)]">
        {label}
      </span>
      <div className="mt-2 flex items-center gap-4">
        {current ? (
          <div className="relative">
            <img
              src={current}
              alt=""
              className="h-24 w-32 rounded-lg border border-[var(--color-border-admin)] object-cover"
            />
            <button
              onClick={() => onChange(null)}
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="h-24 w-32 grid place-items-center rounded-lg border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)]">
            <ImageIcon className="h-6 w-6 text-[var(--color-text-admin-muted)]" />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="text-xs text-[var(--color-text-admin-muted)]"
        />
      </div>
    </div>
  );
}

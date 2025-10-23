// src/pages/admin/settings/AboutSettingsPage.jsx
import { useEffect, useState } from "react";
import { aboutApi } from "../../api/about";
import { Loader2, Save, Image as ImageIcon, X } from "lucide-react";
import toast from "react-hot-toast";

export default function AboutSettingsPage() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await aboutApi.get();
        setData(res.about);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

      const res = await aboutApi.update(form);
      setData(res.about);
      toast.success("About page updated");
    } catch (err) {
      toast.error(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
          About Page Content
        </h1>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-text-admin)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-admin)] hover:opacity-90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>

      {/* HERO SECTION */}
      <SectionCard title="Hero Section">
        <TextInput
          label="Hero Title"
          value={data.heroTitle}
          onChange={(v) => handleInput("heroTitle", v)}
        />
        <TextArea
          label="Hero Subtitle"
          value={data.heroSubtitle}
          onChange={(v) => handleInput("heroSubtitle", v)}
        />
        <ImageUpload
          label="Hero Image"
          current={data.heroImage?.url}
          onChange={(f) => handleFile("heroImage", f)}
        />
      </SectionCard>

      {/* STORY / VALUES */}
      <SectionCard title="Story, Vision & Values">
        {data.dotBlocks.map((b, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border-admin)] p-4 mb-4 bg-[var(--color-bg-card)]"
          >
            <TextInput
              label="Title"
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
              label="Text"
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
          label="Left Image"
          current={data.leftImage?.url}
          onChange={(f) => handleFile("leftImage", f)}
        />
      </SectionCard>

      {/* STATS */}
      <SectionCard title="Stats / Badges">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.stats.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4"
            >
              <TextInput
                label="Value"
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
                label="Label"
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
      <SectionCard title="Materials & Responsibility">
        <TextInput
          label="Title"
          value={data.materialsTitle}
          onChange={(v) => handleInput("materialsTitle", v)}
        />
        <TextArea
          label="Text"
          value={data.materialsText}
          onChange={(v) => handleInput("materialsText", v)}
        />
        <ImageUpload
          label="Materials Image"
          current={data.materialsImage?.url}
          onChange={(f) => handleFile("materialsImage", f)}
        />
      </SectionCard>

      {/* CTA */}
      <SectionCard title="Call To Action">
        <TextInput
          label="Title"
          value={data.ctaTitle}
          onChange={(v) => handleInput("ctaTitle", v)}
        />
        <TextArea
          label="Subtitle"
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

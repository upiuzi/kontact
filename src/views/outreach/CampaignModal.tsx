import React, { useState } from "react";
import { X, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { outreachApi, type SenderProfile } from "../../api/outreach";

interface CampaignModalProps {
  senders: SenderProfile[];
  onClose: () => void;
  onCreated: (campaignId: string) => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  senders,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [senderId, setSenderId] = useState(senders[0]?.id || "");
  const [targetTag, setTargetTag] = useState("");
  const [pitchGoal, setPitchGoal] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(20);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderId) {
      setError("Pilih salah satu profil brand pengirim terlebih dahulu");
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      const created = await outreachApi.createCampaign({
        senderId,
        name,
        targetTag: targetTag || undefined,
        pitchGoal,
        delaySeconds: Number(delaySeconds),
      });

      onCreated(created.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-primary dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Buat Project Campaign Baru
            </h2>
            <p className="text-xs text-neutral-500">
              Kirim email personal ke list calon klien potensial dengan bantuan AI
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
              Nama Campaign / Project *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="misal: Penawaran B2B Exhibitor TEI 2026 - Bahan Baku"
              className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
              Pilih Profil Brand Pengirim (SMTP + AI Persona) *
            </label>
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-neutral-900">
                  {s.name} ({s.fromEmail})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
              Filter Target Kontak berdasarkan Tag / Kategori (Opsional)
            </label>
            <input
              type="text"
              value={targetTag}
              onChange={(e) => setTargetTag(e.target.value)}
              placeholder="misal: Food, Beverage & Agriculture Products (kosongkan untuk semua kontak)"
              className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Sistem akan otomatis mengambil kontak yang memiliki email dan sesuai tag ini.
            </span>
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
              Tujuan Penawaran / Inti Pesan (Instruksi Khusus untuk AI) *
            </label>
            <textarea
              rows={4}
              required
              value={pitchGoal}
              onChange={(e) => setPitchGoal(e.target.value)}
              placeholder="misal: Perkenalkan bahwa kita supplier bahan baku organik grade ekspor. Ajak untuk menjajaki kerja sama suplai atau kirim katalog via WhatsApp/Email. Tawarkan sampel gratis jika dibutuhkan."
              className="w-full p-3 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
              Jeda Waktu Antar Email (Detik)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="120"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-24 px-3 py-1.5 border rounded-xl bg-transparent dark:border-neutral-700 focus:outline-none"
              />
              <span className="text-[11px] text-neutral-400">
                detik per email (fitur anti-spam rate limiter)
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Buat & Muat Kontak
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

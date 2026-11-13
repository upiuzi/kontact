import React, { useState } from "react";
import { X, CheckCircle, AlertCircle, RefreshCw, Send } from "lucide-react";
import { outreachApi, type SenderProfile } from "../../api/outreach";

interface SenderModalProps {
  sender?: SenderProfile | null;
  onClose: () => void;
  onSaved: () => void;
}

export const SenderModal: React.FC<SenderModalProps> = ({
  sender,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(sender?.name || "");
  const [fromName, setFromName] = useState(sender?.fromName || "");
  const [fromEmail, setFromEmail] = useState(sender?.fromEmail || "");
  const [replyTo, setReplyTo] = useState(sender?.replyTo || "");
  const [smtpHost, setSmtpHost] = useState(sender?.smtpHost || "smtp.hostinger.com");
  const [smtpPort, setSmtpPort] = useState(sender?.smtpPort || 465);
  const [smtpSecure, setSmtpSecure] = useState(sender?.smtpSecure ?? true);
  const [smtpUser, setSmtpUser] = useState(sender?.smtpUser || "");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [imapHost, setImapHost] = useState(sender?.imapHost || "imap.hostinger.com");
  const [imapPort, setImapPort] = useState(sender?.imapPort || 993);
  const [imapSecure, setImapSecure] = useState(sender?.imapSecure ?? true);
  const [dailyLimit, setDailyLimit] = useState(sender?.dailyLimit || 100);

  // AI Knowledge Profile
  const [aiKnowledge, setAiKnowledge] = useState(sender?.aiKnowledge || "");
  const [aiTone, setAiTone] = useState(sender?.aiTone || "");
  const [aiExamples, setAiExamples] = useState(sender?.aiExamples || "");
  const [aiGuardrails, setAiGuardrails] = useState(sender?.aiGuardrails || "");

  const [activeTab, setActiveTab] = useState<"smtp" | "ai">("smtp");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await outreachApi.testSmtp({
        host: smtpHost,
        port: Number(smtpPort),
        secure: smtpSecure,
        user: smtpUser,
        password: smtpPassword,
        fromEmail,
      });
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const payload = {
        name,
        fromName,
        fromEmail,
        replyTo: replyTo || fromEmail,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure,
        smtpUser,
        ...(smtpPassword ? { smtpPassword } : {}),
        imapHost,
        imapPort: Number(imapPort),
        imapSecure,
        dailyLimit: Number(dailyLimit),
        aiKnowledge,
        aiTone,
        aiExamples,
        aiGuardrails,
      };

      if (sender) {
        await outreachApi.updateSender(sender.id, payload);
      } else {
        if (!smtpPassword) {
          throw new Error("Password SMTP wajib diisi untuk profil baru");
        }
        await outreachApi.createSender(payload);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-primary dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {sender ? `Edit Profil Brand: ${sender.name}` : "Tambah Profil Brand Baru"}
            </h2>
            <p className="text-xs text-neutral-500">
              Hubungkan akun Hostinger Mail & latih AI khusus untuk brand ini
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-5 gap-4 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={() => setActiveTab("smtp")}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "smtp"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            1. Koneksi Email (Hostinger SMTP/IMAP)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "ai"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            2. Training & AI Knowledge Profile
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "smtp" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                    Nama Profil / Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="misal: POTA.AI atau KOWIR ORGANIK"
                    className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                    Display Name (Nama Pengirim) *
                  </label>
                  <input
                    type="text"
                    required
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="misal: Tim Penjualan Kowir"
                    className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                    Email Pengirim (Hostinger) *
                  </label>
                  <input
                    type="email"
                    required
                    value={fromEmail}
                    onChange={(e) => {
                      setFromEmail(e.target.value);
                      if (!smtpUser) setSmtpUser(e.target.value);
                    }}
                    placeholder="halo@kowir.com atau info@pota.ai"
                    className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                    Reply-To (Opsional)
                  </label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="Sama dengan email pengirim jika kosong"
                    className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* SMTP Settings */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3">
                <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                  <span>Pengaturan SMTP (Kirim Email)</span>
                  <span className="text-[10px] text-neutral-400">Hostinger Default: smtp.hostinger.com (Port 465)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block mb-1 text-neutral-600 dark:text-neutral-400">Host</label>
                    <input
                      type="text"
                      required
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-transparent dark:border-neutral-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-neutral-600 dark:text-neutral-400">Port</label>
                    <input
                      type="number"
                      required
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-transparent dark:border-neutral-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 text-neutral-600 dark:text-neutral-400">SMTP Username</label>
                    <input
                      type="text"
                      required
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="email@domainanda.com"
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-transparent dark:border-neutral-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-neutral-600 dark:text-neutral-400">
                      SMTP Password {sender ? "(Biarkan kosong jika tidak diubah)" : "*"}
                    </label>
                    <input
                      type="password"
                      required={!sender}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="Password email Hostinger"
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-transparent dark:border-neutral-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>Gunakan SSL/TLS Aman (Direkomendasikan untuk Port 465)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || (!smtpPassword && !sender)}
                    className="px-3 py-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Tes Koneksi SMTP
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      testResult.success
                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30"
                        : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* IMAP Settings for AI Replies */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                  <span>Pengaturan IMAP (Untuk Membaca Balasan Klien)</span>
                  <span className="text-[10px] text-neutral-400">imap.hostinger.com (Port 993)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block mb-1 text-neutral-600 dark:text-neutral-400">Host IMAP</label>
                    <input
                      type="text"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-transparent dark:border-neutral-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-neutral-600 dark:text-neutral-400">Port IMAP</label>
                    <input
                      type="number"
                      value={imapPort}
                      onChange={(e) => setImapPort(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-transparent dark:border-neutral-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                  Batasan Kirim Harian (Daily Limit)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="w-32 px-3 py-1.5 border rounded-xl bg-transparent dark:border-neutral-700 focus:outline-none"
                />
                <span className="text-neutral-400 text-[11px] ml-2">
                  Rekomendasi Hostinger: 100 - 300 email/hari per domain agar aman dari spam
                </span>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                  Knowledge Base Bisnis & Produk (Pelatihan AI)
                </label>
                <p className="text-[11px] text-neutral-400 mb-1.5">
                  Jelaskan tentang perusahaan Anda, katalog produk, sertifikasi, keunggulan, MOQ, atau layanan yang ditawarkan.
                </p>
                <textarea
                  rows={4}
                  value={aiKnowledge}
                  onChange={(e) => setAiKnowledge(e.target.value)}
                  placeholder="misal: PT Kowir Organik adalah supplier bahan baku organik grade ekspor (beras organik, rempah-rempah, vanila). Sertifikasi kami EU Organic & Halal. Kapasitas 20 ton/bulan..."
                  className="w-full p-3 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                  Tone of Voice (Gaya Bahasa & Persona)
                </label>
                <input
                  type="text"
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  placeholder="misal: Hangat, profesional B2B, bersahabat, menghargai kerja sama bisnis"
                  className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                  Contoh Email Sukses (Few-Shot Training)
                </label>
                <p className="text-[11px] text-neutral-400 mb-1.5">
                  Tempelkan 1 contoh email penawaran yang menurut Anda paling bagus. AI akan meniru gaya penulisan ini.
                </p>
                <textarea
                  rows={3}
                  value={aiExamples}
                  onChange={(e) => setAiExamples(e.target.value)}
                  placeholder="Halo Pak Budi, salam kenal dari tim Kowir. Kami melihat profil CV Anda di pameran TEI..."
                  className="w-full p-3 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                  Pantangan & Aturan Khusus (Guardrails)
                </label>
                <textarea
                  rows={2}
                  value={aiGuardrails}
                  onChange={(e) => setAiGuardrails(e.target.value)}
                  placeholder="misal: Jangan langsung beri harga tetap di email pertama, selalu tawarkan kirim katalog atau call 15 menit via WhatsApp. Gunakan bahasa Indonesia yang luwes."
                  className="w-full p-3 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-primary text-white font-medium rounded-xl text-xs hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Simpan Profil Brand
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

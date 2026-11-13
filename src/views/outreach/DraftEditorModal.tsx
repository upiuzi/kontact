import React, { useState } from "react";
import { X, Check, Mail, MessageSquare, Sparkles, Send, RefreshCw } from "lucide-react";
import { outreachApi, type Recipient } from "../../api/outreach";

interface DraftEditorModalProps {
  recipient: Recipient;
  onClose: () => void;
  onUpdated: (updated: Recipient) => void;
}

export const DraftEditorModal: React.FC<DraftEditorModalProps> = ({
  recipient,
  onClose,
  onUpdated,
}) => {
  const [subject, setSubject] = useState(recipient.subject || "");
  const [bodyText, setBodyText] = useState(recipient.bodyText || "");
  const [status, setStatus] = useState(recipient.status);
  const [isSaving, setIsSaving] = useState(false);

  // If client replied, state for reply response
  const [replyResponse, setReplyResponse] = useState(recipient.aiDraftReply || "");

  const handleSave = async (newStatus?: string) => {
    setIsSaving(true);
    try {
      const updated = await outreachApi.updateRecipient(recipient.id, {
        subject,
        bodyText,
        status: newStatus || status,
      });
      onUpdated(updated);
      onClose();
    } catch (err: unknown) {
      alert(`Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}`);
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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {recipient.toName}
              </h2>
              {recipient.company && (
                <span className="text-xs text-neutral-500 font-medium">
                  · {recipient.company}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {recipient.toEmail} {recipient.category && `· Kategori: ${recipient.category}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Incoming client reply banner if replied */}
          {recipient.status === "replied" && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                <MessageSquare className="w-4 h-4" />
                <span>Balasan Klien Masuk ({recipient.repliedAt ? new Date(recipient.repliedAt).toLocaleString() : "Baru saja"})</span>
              </div>
              <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                {recipient.replyText || "(Pesan masuk di inbox Hostinger Anda)"}
              </div>

              {/* AI Draft Reply */}
              <div className="pt-2 space-y-1.5">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Rekomendasi Draf Balasan dari AI:
                </label>
                <textarea
                  rows={4}
                  value={replyResponse}
                  onChange={(e) => setReplyResponse(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Outgoing Email Draft */}
          <div className="space-y-3">
            <div>
              <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                Subjek Email
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subjek email..."
                className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none font-medium text-sm"
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                Isi Email (Body)
              </label>
              <textarea
                rows={10}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Isi email penawaran..."
                className="w-full p-3 border rounded-xl bg-transparent dark:border-neutral-700 focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Recipient["status"])}
              className="text-xs font-semibold px-2 py-1 rounded-lg border dark:border-neutral-700 bg-transparent"
            >
              <option value="pending_draft" className="dark:bg-neutral-900">Pending Draft</option>
              <option value="draft_ready" className="dark:bg-neutral-900">Draft Ready</option>
              <option value="approved" className="dark:bg-neutral-900">Approved (Siap Kirim)</option>
              <option value="sent" className="dark:bg-neutral-900">Terkirim</option>
              <option value="replied" className="dark:bg-neutral-900">Dibalas Klien</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSave("approved")}
              disabled={isSaving || !subject || !bodyText}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Approve & Siap Kirim
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-4 py-2 bg-primary text-white font-medium rounded-xl text-xs hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

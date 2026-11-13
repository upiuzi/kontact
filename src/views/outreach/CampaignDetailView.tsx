import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  CheckCheck,
  Send,
  RefreshCw,
  AlertCircle,
  Eye,
  Mail,
  Users,
  CheckCircle2,
  Clock,
  MessageSquare,
} from "lucide-react";
import {
  outreachApi,
  type Campaign,
  type Recipient,
} from "../../api/outreach";
import { DraftEditorModal } from "./DraftEditorModal";

export const CampaignDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);

  // Action states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const camp = await outreachApi.getCampaign(id);
      setCampaign(camp);

      const statusFilter = filterStatus === "all" ? undefined : filterStatus;
      const recs = await outreachApi.listRecipients(id, statusFilter);
      setRecipients(recs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [id, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateDrafts = async () => {
    if (!id) return;
    setIsGenerating(true);
    setActionMessage("AI sedang menyusun draf email personalisasi...");
    try {
      const res = await outreachApi.generateDrafts(id, 20);
      setActionMessage(`Berhasil membuat ${res.generated} draf email.`);
      await loadData();
    } catch (err: unknown) {
      setError(`Gagal generate draf AI: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAll = async () => {
    if (!id) return;
    try {
      const res = await outreachApi.approveAll(id);
      setActionMessage(`${res.approved} draf disetujui (Approved) & siap dikirim.`);
      await loadData();
    } catch (err: unknown) {
      setError(`Gagal approve draf: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSendBatch = async () => {
    if (!id) return;
    if (!window.confirm("Kirim antrean email yang berstatus Approved sekarang?")) {
      return;
    }
    setIsSending(true);
    setActionMessage("Sedang mengirim email bertahap melalui Hostinger SMTP...");
    try {
      const res = await outreachApi.sendCampaign(id, 10);
      setActionMessage(
        `Batch selesai: ${res.sent} terkirim, ${res.failed} gagal. Sisa approved: ${res.remainingApproved}.`,
      );
      await loadData();
    } catch (err: unknown) {
      setError(`Pengiriman gagal: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  if (loading && !campaign) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex-1 p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold">Campaign tidak ditemukan</h2>
        <button
          onClick={() => navigate("/campaigns")}
          className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
        >
          Kembali ke Daftar Campaign
        </button>
      </div>
    );
  }

  const counts = campaign.counts || {
    total: campaign.totalRecipients,
    pending_draft: 0,
    draft_ready: 0,
    approved: 0,
    sent: campaign.sentCount,
    failed: campaign.failedCount,
    replied: 0,
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Top Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-surface-primary dark:bg-neutral-900/60 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate("/campaigns")}
            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              {campaign.name}
            </h1>
            <p className="text-xs text-neutral-500">
              Pengirim: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{campaign.senderName}</span> ({campaign.fromEmail})
              {campaign.targetTag && ` · Tag Target: ${campaign.targetTag}`}
            </p>
          </div>
        </div>

        {/* Goal Banner */}
        <div className="mt-3 p-3 bg-neutral-100/70 dark:bg-neutral-800/50 rounded-xl text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Tujuan Penawaran AI: </span>
            {campaign.pitchGoal}
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 mt-4">
          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <span className="text-[10px] text-neutral-400 font-medium">Total Target</span>
            <div className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100">{counts.total}</div>
          </div>
          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <span className="text-[10px] text-neutral-400 font-medium">Pending Draf AI</span>
            <div className="text-lg font-extrabold text-amber-500">{counts.pending_draft}</div>
          </div>
          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <span className="text-[10px] text-neutral-400 font-medium">Draf Siap Review</span>
            <div className="text-lg font-extrabold text-blue-500">{counts.draft_ready}</div>
          </div>
          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <span className="text-[10px] text-neutral-400 font-medium">Approved (Siap Kirim)</span>
            <div className="text-lg font-extrabold text-emerald-500">{counts.approved}</div>
          </div>
          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <span className="text-[10px] text-neutral-400 font-medium">Email Terkirim</span>
            <div className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100">{counts.sent}</div>
          </div>
          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <span className="text-[10px] text-neutral-400 font-medium">Balasan Klien</span>
            <div className="text-lg font-extrabold text-indigo-500 flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{counts.replied}</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateDrafts}
              disabled={isGenerating || counts.pending_draft === 0}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              1. Generate Draf AI ({counts.pending_draft})
            </button>

            <button
              onClick={handleApproveAll}
              disabled={counts.draft_ready === 0}
              className="px-3.5 py-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              2. Approve Semua Draf Siap ({counts.draft_ready})
            </button>

            <button
              onClick={handleSendBatch}
              disabled={isSending || counts.approved === 0}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              3. Kirim Email Approved ({counts.approved})
            </button>
          </div>

          <button
            onClick={() => loadData()}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {actionMessage && (
          <div className="mt-2 text-xs font-medium text-primary">
            {actionMessage}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center gap-2 overflow-x-auto text-xs py-2 shrink-0">
        {[
          { key: "all", label: `Semua (${counts.total})` },
          { key: "pending_draft", label: `Pending AI (${counts.pending_draft})` },
          { key: "draft_ready", label: `Draf Siap (${counts.draft_ready})` },
          { key: "approved", label: `Approved (${counts.approved})` },
          { key: "sent", label: `Terkirim (${counts.sent})` },
          { key: "replied", label: `Dibalas (${counts.replied})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilterStatus(t.key)}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filterStatus === t.key
                ? "bg-primary text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table / List */}
      <div className="flex-1 overflow-y-auto p-6">
        {recipients.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-xs">
            Tidak ada kontak dalam filter ini.
          </div>
        ) : (
          <div className="bg-surface-primary dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Calon Klien</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Subjek Email</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {recipients.map((r) => {
                  let badgeColor = "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
                  let label = r.status;
                  if (r.status === "pending_draft") {
                    badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
                    label = "Pending AI";
                  } else if (r.status === "draft_ready") {
                    badgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
                    label = "Draf Siap";
                  } else if (r.status === "approved") {
                    badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
                    label = "Approved";
                  } else if (r.status === "sent") {
                    badgeColor = "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400";
                    label = "Terkirim";
                  } else if (r.status === "replied") {
                    badgeColor = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30";
                    label = "Dibalas Klien";
                  }

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedRecipient(r)}
                    >
                      <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-100">
                        {r.toName}
                        {r.company && (
                          <span className="block text-[11px] font-normal text-neutral-400">
                            {r.company}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                        {r.toEmail}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 max-w-[150px] truncate">
                        {r.category || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeColor}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 max-w-[200px] truncate">
                        {r.subject || <span className="text-neutral-400 italic">Belum dibuat</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecipient(r);
                          }}
                          className="px-2.5 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {selectedRecipient && (
        <DraftEditorModal
          recipient={selectedRecipient}
          onClose={() => setSelectedRecipient(null)}
          onUpdated={(updated) => {
            setRecipients((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            );
            loadData();
          }}
        />
      )}
    </div>
  );
};

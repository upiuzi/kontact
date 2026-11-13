import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Server,
  Layers,
  ArrowRight,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  Trash2,
  Edit2,
} from "lucide-react";
import {
  outreachApi,
  type Campaign,
  type SenderProfile,
} from "../../api/outreach";
import { SenderModal } from "./SenderModal";
import { CampaignModal } from "./CampaignModal";

export const OutreachView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"campaigns" | "senders">("campaigns");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [senders, setSenders] = useState<SenderProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showSenderModal, setShowSenderModal] = useState(false);
  const [editingSender, setEditingSender] = useState<SenderProfile | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  // IMAP Sync state
  const [syncingSenderId, setSyncingSenderId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cList, sList] = await Promise.all([
        outreachApi.listCampaigns(),
        outreachApi.listSenders(),
      ]);
      setCampaigns(cList);
      setSenders(sList);
    } catch (err) {
      console.error("Failed to load outreach data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncReplies = async (senderId: string) => {
    setSyncingSenderId(senderId);
    setSyncMessage(null);
    try {
      const res = await outreachApi.syncReplies(senderId);
      setSyncMessage(res.message);
      await loadData();
    } catch (err: unknown) {
      setSyncMessage(
        `Sync gagal: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSyncingSenderId(null);
    }
  };

  const handleDeleteSender = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Hapus profil brand ${name}? Semua campaign yang terhubung akan terhapus.`,
      )
    ) {
      return;
    }
    try {
      await outreachApi.deleteSender(id);
      await loadData();
    } catch (err) {
      alert("Gagal menghapus profil sender");
    }
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!window.confirm(`Hapus campaign "${name}"?`)) return;
    try {
      await outreachApi.deleteCampaign(id);
      await loadData();
    } catch (err) {
      alert("Gagal menghapus campaign");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Top Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-surface-primary dark:bg-neutral-900/60 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              AI Email Campaigns & Multi-Brand Outreach
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Kirim email penawaran B2B personal dengan AI menggunakan banyak akun Hostinger Mail (Pota.ai, Kowir, Ruga, dll).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === "campaigns" ? (
              <button
                onClick={() => {
                  if (senders.length === 0) {
                    alert("Tambahkan minimal 1 Profil Brand (SMTP Hostinger) terlebih dahulu");
                    setActiveTab("senders");
                    setShowSenderModal(true);
                    return;
                  }
                  setShowCampaignModal(true);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Buat Campaign Baru
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingSender(null);
                  setShowSenderModal(true);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Profil Brand
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-neutral-200 dark:border-neutral-800 mt-6 -mb-6">
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "campaigns"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Campaigns ({campaigns.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("senders")}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "senders"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Profil Brand & SMTP ({senders.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : activeTab === "campaigns" ? (
          <div>
            {campaigns.length === 0 ? (
              <div className="text-center py-16 px-4 max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-base">
                  Belum ada Campaign Outreach
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Mulai kirim penawaran bisnis ke kontak pameran TEI 2026 yang sudah Anda import. AI akan menuliskan draf email yang unik dan relevan untuk setiap calon klien.
                </p>
                <button
                  onClick={() => {
                    if (senders.length === 0) {
                      setActiveTab("senders");
                      setShowSenderModal(true);
                      return;
                    }
                    setShowCampaignModal(true);
                  }}
                  className="px-5 py-2.5 bg-primary text-white font-medium text-xs rounded-xl inline-flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Mulai Campaign Pertama
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map((camp) => {
                  const progressPct =
                    camp.totalRecipients > 0
                      ? Math.round((camp.sentCount / camp.totalRecipients) * 100)
                      : 0;

                  return (
                    <div
                      key={camp.id}
                      onClick={() => navigate(`/campaigns/${camp.id}`)}
                      className="p-5 bg-surface-primary dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-primary/50 transition-all cursor-pointer shadow-sm flex flex-col justify-between group space-y-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm group-hover:text-primary transition-colors">
                            {camp.name}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCampaign(camp.id, camp.name);
                            }}
                            className="p-1 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Hapus Campaign"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-1">
                          Pengirim: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{camp.senderName}</span>
                        </div>
                        {camp.targetTag && (
                          <div className="mt-2 inline-block px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] font-medium">
                            Tag: {camp.targetTag}
                          </div>
                        )}
                        <p className="text-xs text-neutral-500 mt-2 line-clamp-2">
                          {camp.pitchGoal}
                        </p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-500">
                            {camp.sentCount} dari {camp.totalRecipients} terkirim
                          </span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">
                            {progressPct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-primary font-semibold">
                          <span>Kelola Draf & Kirim</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Senders Tab */
          <div className="space-y-4">
            {syncMessage && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{syncMessage}</span>
              </div>
            )}

            {senders.length === 0 ? (
              <div className="text-center py-16 px-4 max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                  <Server className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-base">
                  Belum ada Profil Brand
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Tambahkan akun Hostinger Mail Anda (misal untuk pota.ai, kowir, atau ruga) lengkap dengan informasi produk untuk melatih AI.
                </p>
                <button
                  onClick={() => {
                    setEditingSender(null);
                    setShowSenderModal(true);
                  }}
                  className="px-5 py-2.5 bg-primary text-white font-medium text-xs rounded-xl inline-flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Profil Pertama
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {senders.map((s) => (
                  <div
                    key={s.id}
                    className="p-5 bg-surface-primary dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                          {s.name}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {s.fromName} &lt;{s.fromEmail}&gt;
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingSender(s);
                            setShowSenderModal(true);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          title="Edit Profil"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSender(s.id, s.name)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          title="Hapus Profil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between text-neutral-600 dark:text-neutral-400 text-[11px]">
                        <span>SMTP Host:</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{s.smtpHost}:{s.smtpPort}</span>
                      </div>
                      <div className="flex justify-between text-neutral-600 dark:text-neutral-400 text-[11px]">
                        <span>Kirim Hari Ini:</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{s.sentToday} / {s.dailyLimit}</span>
                      </div>
                      {s.aiTone && (
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-400 text-[11px]">
                          <span>AI Tone:</span>
                          <span className="font-medium text-primary truncate max-w-[150px]">{s.aiTone}</span>
                        </div>
                      )}
                    </div>

                    {s.aiKnowledge && (
                      <p className="text-xs text-neutral-500 line-clamp-2 italic">
                        "{s.aiKnowledge}"
                      </p>
                    )}

                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                      <button
                        onClick={() => handleSyncReplies(s.id)}
                        disabled={syncingSenderId === s.id}
                        className="w-full py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {syncingSenderId === s.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>Cek Balasan Klien (IMAP Hostinger)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSenderModal && (
        <SenderModal
          sender={editingSender}
          onClose={() => setShowSenderModal(false)}
          onSaved={loadData}
        />
      )}

      {showCampaignModal && (
        <CampaignModal
          senders={senders}
          onClose={() => setShowCampaignModal(false)}
          onCreated={(cId) => {
            loadData();
            navigate(`/campaigns/${cId}`);
          }}
        />
      )}
    </div>
  );
};

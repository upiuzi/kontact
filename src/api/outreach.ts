import { apiJson, jsonBody } from "./client";

export interface SenderProfile {
  id: string;
  name: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  imapHost?: string | null;
  imapPort?: number;
  imapSecure?: boolean;
  dailyLimit: number;
  sentToday: number;
  lastSentDate?: string | null;
  aiKnowledge?: string | null;
  aiTone?: string | null;
  aiExamples?: string | null;
  aiGuardrails?: string | null;
  aiModel?: string | null;
  hasPassword?: boolean;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  senderId: string;
  senderName: string;
  fromEmail: string;
  targetTag?: string | null;
  targetListId?: string | null;
  pitchGoal: string;
  status: "draft" | "generating" | "ready" | "sending" | "paused" | "completed";
  delaySeconds: number;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  counts?: {
    total: number;
    pending_draft: number;
    draft_ready: number;
    approved: number;
    sent: number;
    failed: number;
    replied: number;
  };
}

export interface Recipient {
  id: string;
  campaignId: string;
  contactId: string;
  toEmail: string;
  toName: string;
  company?: string | null;
  category?: string | null;
  subject?: string | null;
  bodyText?: string | null;
  status: "pending_draft" | "draft_ready" | "approved" | "sending" | "sent" | "failed" | "replied";
  errorMessage?: string | null;
  sentAt?: string | null;
  repliedAt?: string | null;
  replyText?: string | null;
  aiDraftReply?: string | null;
}

export const outreachApi = {
  // Senders
  listSenders: () => apiJson<SenderProfile[]>("/outreach/senders"),
  getSender: (id: string) => apiJson<SenderProfile>(`/outreach/senders/${id}`),
  createSender: (data: Partial<SenderProfile> & { smtpPassword?: string }) =>
    apiJson<SenderProfile>("/outreach/senders", {
      method: "POST",
      ...jsonBody(data),
    }),
  updateSender: (
    id: string,
    data: Partial<SenderProfile> & { smtpPassword?: string },
  ) =>
    apiJson<SenderProfile>(`/outreach/senders/${id}`, {
      method: "PATCH",
      ...jsonBody(data),
    }),
  deleteSender: (id: string) =>
    apiJson<{ success: boolean }>(`/outreach/senders/${id}`, {
      method: "DELETE",
    }),
  testSmtp: (data: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password?: string;
    fromEmail: string;
    testTo?: string;
  }) =>
    apiJson<{ success: boolean; message: string }>("/outreach/senders/test", {
      method: "POST",
      ...jsonBody(data),
    }),
  syncReplies: (senderId: string) =>
    apiJson<{ success: boolean; matchedReplies: number; message: string }>(
      `/outreach/senders/${senderId}/sync-replies`,
      { method: "POST" },
    ),

  // Campaigns
  listCampaigns: () => apiJson<Campaign[]>("/outreach/campaigns"),
  getCampaign: (id: string) => apiJson<Campaign>(`/outreach/campaigns/${id}`),
  createCampaign: (data: {
    senderId: string;
    name: string;
    targetTag?: string;
    targetListId?: string;
    pitchGoal: string;
    delaySeconds?: number;
  }) =>
    apiJson<Campaign>("/outreach/campaigns", {
      method: "POST",
      ...jsonBody(data),
    }),
  deleteCampaign: (id: string) =>
    apiJson<{ success: boolean }>(`/outreach/campaigns/${id}`, {
      method: "DELETE",
    }),
  populateRecipients: (campaignId: string) =>
    apiJson<{ added: number; total: number }>(
      `/outreach/campaigns/${campaignId}/populate`,
      { method: "POST" },
    ),
  listRecipients: (campaignId: string, status?: string) =>
    apiJson<Recipient[]>(
      `/outreach/campaigns/${campaignId}/recipients${
        status ? `?status=${encodeURIComponent(status)}` : ""
      }`,
    ),
  updateRecipient: (
    id: string,
    data: { subject?: string; bodyText?: string; status?: string },
  ) =>
    apiJson<Recipient>(`/outreach/recipients/${id}`, {
      method: "PATCH",
      ...jsonBody(data),
    }),
  generateDrafts: (campaignId: string, batchSize: number = 20) =>
    apiJson<{ generated: number; remaining: number }>(
      `/outreach/campaigns/${campaignId}/generate-drafts`,
      { method: "POST", ...jsonBody({ batchSize }) },
    ),
  approveAll: (campaignId: string) =>
    apiJson<{ approved: number }>(
      `/outreach/campaigns/${campaignId}/approve-all`,
      { method: "POST" },
    ),
  sendCampaign: (campaignId: string, maxCount: number = 10) =>
    apiJson<{ sent: number; failed: number; remainingApproved: number }>(
      `/outreach/campaigns/${campaignId}/send`,
      { method: "POST", ...jsonBody({ maxCount }) },
    ),
};

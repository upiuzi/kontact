/**
 * Outreach service: multi-brand sender profiles (Hostinger / any SMTP),
 * AI knowledge personas, campaign target population, AI cold email drafting,
 * throttled sending queue, CRM interaction sync, and IMAP reply detection.
 */

import crypto from "node:crypto";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { ImapFlow } from "imapflow";
import { db, sqlite } from "../db.ts";
import {
  senderProfiles,
  outreachCampaigns,
  outreachRecipients,
  contacts,
  contactEmails,
  contactTags,
  listMembers,
} from "../db/schema.ts";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import type { Scope } from "../tenancy/scope.ts";
import { seal, open } from "../utils/secretBox.ts";
import { log } from "../utils/logger.ts";
import { AppError, NotFoundError, ValidationError } from "../utils/AppError.ts";
import { generateFor } from "../ai/gateway.ts";
import { interactionService } from "./interactionService.ts";

export interface SenderProfileInput {
  name: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  smtpHost: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser: string;
  smtpPassword?: string;
  imapHost?: string | null;
  imapPort?: number;
  imapSecure?: boolean;
  dailyLimit?: number;
  aiKnowledge?: string | null;
  aiTone?: string | null;
  aiExamples?: string | null;
  aiGuardrails?: string | null;
  aiModel?: string | null;
}

export interface CampaignCreateInput {
  senderId: string;
  name: string;
  targetTag?: string | null;
  targetListId?: string | null;
  pitchGoal: string;
  delaySeconds?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const outreachService = {
  // ==========================================
  // SENDER PROFILES
  // ==========================================

  async listSenderProfiles(scope: Scope) {
    const rows = await db
      .select({
        id: senderProfiles.id,
        name: senderProfiles.name,
        fromName: senderProfiles.fromName,
        fromEmail: senderProfiles.fromEmail,
        replyTo: senderProfiles.replyTo,
        smtpHost: senderProfiles.smtpHost,
        smtpPort: senderProfiles.smtpPort,
        smtpSecure: senderProfiles.smtpSecure,
        smtpUser: senderProfiles.smtpUser,
        imapHost: senderProfiles.imapHost,
        imapPort: senderProfiles.imapPort,
        imapSecure: senderProfiles.imapSecure,
        dailyLimit: senderProfiles.dailyLimit,
        sentToday: senderProfiles.sentToday,
        lastSentDate: senderProfiles.lastSentDate,
        aiKnowledge: senderProfiles.aiKnowledge,
        aiTone: senderProfiles.aiTone,
        aiExamples: senderProfiles.aiExamples,
        aiGuardrails: senderProfiles.aiGuardrails,
        aiModel: senderProfiles.aiModel,
        createdAt: senderProfiles.createdAt,
        updatedAt: senderProfiles.updatedAt,
      })
      .from(senderProfiles)
      .where(eq(senderProfiles.ownerId, scope.ownerId))
      .orderBy(desc(senderProfiles.createdAt));

    return rows.map((r) => ({
      ...r,
      smtpSecure: Boolean(r.smtpSecure),
      imapSecure: Boolean(r.imapSecure),
      hasPassword: true,
    }));
  },

  async getSenderProfile(scope: Scope, id: string) {
    const row = await db
      .select()
      .from(senderProfiles)
      .where(
        and(eq(senderProfiles.id, id), eq(senderProfiles.ownerId, scope.ownerId)),
      )
      .get();

    if (!row) throw new NotFoundError("Sender profile");
    return {
      ...row,
      smtpSecure: Boolean(row.smtpSecure),
      imapSecure: Boolean(row.imapSecure),
      smtpPasswordSealed: undefined,
      hasPassword: true,
    };
  },

  async createSenderProfile(scope: Scope, input: SenderProfileInput) {
    if (!input.smtpPassword) {
      throw new ValidationError("SMTP password is required");
    }

    const id = crypto.randomUUID();
    const sealedPassword = seal(input.smtpPassword);

    await db.insert(senderProfiles).values({
      id,
      ownerId: scope.ownerId,
      name: input.name.trim(),
      fromName: input.fromName.trim(),
      fromEmail: input.fromEmail.trim(),
      replyTo: input.replyTo ? input.replyTo.trim() : input.fromEmail.trim(),
      smtpHost: input.smtpHost.trim(),
      smtpPort: input.smtpPort ?? 465,
      smtpSecure: input.smtpSecure === false ? 0 : 1,
      smtpUser: input.smtpUser.trim(),
      smtpPasswordSealed: sealedPassword,
      imapHost: input.imapHost?.trim() || null,
      imapPort: input.imapPort ?? 993,
      imapSecure: input.imapSecure === false ? 0 : 1,
      dailyLimit: input.dailyLimit ?? 100,
      aiKnowledge: input.aiKnowledge?.trim() || null,
      aiTone: input.aiTone?.trim() || null,
      aiExamples: input.aiExamples?.trim() || null,
      aiGuardrails: input.aiGuardrails?.trim() || null,
      aiModel: input.aiModel?.trim() || null,
    });

    return this.getSenderProfile(scope, id);
  },

  async updateSenderProfile(
    scope: Scope,
    id: string,
    input: Partial<SenderProfileInput>,
  ) {
    const existing = await db
      .select()
      .from(senderProfiles)
      .where(
        and(eq(senderProfiles.id, id), eq(senderProfiles.ownerId, scope.ownerId)),
      )
      .get();

    if (!existing) throw new NotFoundError("Sender profile");

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.fromName !== undefined) updates.fromName = input.fromName.trim();
    if (input.fromEmail !== undefined) updates.fromEmail = input.fromEmail.trim();
    if (input.replyTo !== undefined) updates.replyTo = input.replyTo?.trim() || null;
    if (input.smtpHost !== undefined) updates.smtpHost = input.smtpHost.trim();
    if (input.smtpPort !== undefined) updates.smtpPort = input.smtpPort;
    if (input.smtpSecure !== undefined)
      updates.smtpSecure = input.smtpSecure ? 1 : 0;
    if (input.smtpUser !== undefined) updates.smtpUser = input.smtpUser.trim();
    if (input.smtpPassword) {
      updates.smtpPasswordSealed = seal(input.smtpPassword);
    }
    if (input.imapHost !== undefined)
      updates.imapHost = input.imapHost?.trim() || null;
    if (input.imapPort !== undefined) updates.imapPort = input.imapPort;
    if (input.imapSecure !== undefined)
      updates.imapSecure = input.imapSecure ? 1 : 0;
    if (input.dailyLimit !== undefined) updates.dailyLimit = input.dailyLimit;
    if (input.aiKnowledge !== undefined)
      updates.aiKnowledge = input.aiKnowledge?.trim() || null;
    if (input.aiTone !== undefined) updates.aiTone = input.aiTone?.trim() || null;
    if (input.aiExamples !== undefined)
      updates.aiExamples = input.aiExamples?.trim() || null;
    if (input.aiGuardrails !== undefined)
      updates.aiGuardrails = input.aiGuardrails?.trim() || null;
    if (input.aiModel !== undefined)
      updates.aiModel = input.aiModel?.trim() || null;

    await db
      .update(senderProfiles)
      .set(updates)
      .where(
        and(eq(senderProfiles.id, id), eq(senderProfiles.ownerId, scope.ownerId)),
      );

    return this.getSenderProfile(scope, id);
  },

  async deleteSenderProfile(scope: Scope, id: string) {
    const existing = await db
      .select({ id: senderProfiles.id })
      .from(senderProfiles)
      .where(
        and(eq(senderProfiles.id, id), eq(senderProfiles.ownerId, scope.ownerId)),
      )
      .get();

    if (!existing) throw new NotFoundError("Sender profile");

    await db
      .delete(senderProfiles)
      .where(
        and(eq(senderProfiles.id, id), eq(senderProfiles.ownerId, scope.ownerId)),
      );

    return { success: true };
  },

  async testSmtp(params: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password?: string;
    fromEmail: string;
    testTo?: string;
  }) {
    if (!params.password) {
      throw new ValidationError("Password is required for SMTP test");
    }

    const transport = nodemailer.createTransport({
      host: params.host,
      port: params.port,
      secure: params.secure,
      auth: {
        user: params.user,
        pass: params.password,
      },
      connectionTimeout: 10000,
    });

    try {
      await transport.verify();
      if (params.testTo) {
        await transport.sendMail({
          from: params.fromEmail,
          to: params.testTo,
          subject: "Test Connection - Contrack Outreach",
          text: `Halo!\n\nKoneksi SMTP dari ${params.fromEmail} berhasil diverifikasi oleh Contrack.\n\nWaktu: ${new Date().toLocaleString()}`,
        });
      }
      return { success: true, message: "Koneksi SMTP berhasil!" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppError(`Koneksi SMTP Gagal: ${msg}`, 400);
    }
  },

  // ==========================================
  // CAMPAIGNS
  // ==========================================

  async listCampaigns(scope: Scope) {
    const rows = await db
      .select({
        campaign: outreachCampaigns,
        senderName: senderProfiles.name,
        fromEmail: senderProfiles.fromEmail,
      })
      .from(outreachCampaigns)
      .innerJoin(
        senderProfiles,
        eq(outreachCampaigns.senderId, senderProfiles.id),
      )
      .where(eq(outreachCampaigns.ownerId, scope.ownerId))
      .orderBy(desc(outreachCampaigns.createdAt));

    return rows.map(({ campaign, senderName, fromEmail }) => ({
      ...campaign,
      senderName,
      fromEmail,
    }));
  },

  async getCampaign(scope: Scope, id: string) {
    const row = await db
      .select({
        campaign: outreachCampaigns,
        sender: senderProfiles,
      })
      .from(outreachCampaigns)
      .innerJoin(
        senderProfiles,
        eq(outreachCampaigns.senderId, senderProfiles.id),
      )
      .where(
        and(
          eq(outreachCampaigns.id, id),
          eq(outreachCampaigns.ownerId, scope.ownerId),
        ),
      )
      .get();

    if (!row) throw new NotFoundError("Campaign");

    const counts = (sqlite
      .prepare(
        `SELECT status, COUNT(*) as count 
         FROM outreach_recipients 
         WHERE campaignId = ? AND ownerId = ? 
         GROUP BY status`,
      )
      .all(id, scope.ownerId) as Array<{ status: string; count: number }>).reduce(
      (acc, curr) => {
        acc[curr.status] = curr.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ...row.campaign,
      sender: {
        id: row.sender.id,
        name: row.sender.name,
        fromName: row.sender.fromName,
        fromEmail: row.sender.fromEmail,
        replyTo: row.sender.replyTo,
        aiModel: row.sender.aiModel,
      },
      counts: {
        total: row.campaign.totalRecipients,
        pending_draft: counts["pending_draft"] || 0,
        draft_ready: counts["draft_ready"] || 0,
        approved: counts["approved"] || 0,
        sent: counts["sent"] || 0,
        failed: counts["failed"] || 0,
        replied: counts["replied"] || 0,
      },
    };
  },

  async createCampaign(scope: Scope, input: CampaignCreateInput) {
    const sender = await db
      .select({ id: senderProfiles.id })
      .from(senderProfiles)
      .where(
        and(
          eq(senderProfiles.id, input.senderId),
          eq(senderProfiles.ownerId, scope.ownerId),
        ),
      )
      .get();

    if (!sender) throw new NotFoundError("Sender profile");

    const id = crypto.randomUUID();
    await db.insert(outreachCampaigns).values({
      id,
      ownerId: scope.ownerId,
      senderId: input.senderId,
      name: input.name.trim(),
      targetTag: input.targetTag?.trim() || null,
      targetListId: input.targetListId || null,
      pitchGoal: input.pitchGoal.trim(),
      delaySeconds: input.delaySeconds ?? 20,
    });

    // Populate matching contacts automatically
    await this.populateRecipients(scope, id);

    return this.getCampaign(scope, id);
  },

  async deleteCampaign(scope: Scope, id: string) {
    const existing = await db
      .select({ id: outreachCampaigns.id })
      .from(outreachCampaigns)
      .where(
        and(
          eq(outreachCampaigns.id, id),
          eq(outreachCampaigns.ownerId, scope.ownerId),
        ),
      )
      .get();

    if (!existing) throw new NotFoundError("Campaign");

    await db
      .delete(outreachCampaigns)
      .where(
        and(
          eq(outreachCampaigns.id, id),
          eq(outreachCampaigns.ownerId, scope.ownerId),
        ),
      );

    return { success: true };
  },

  async populateRecipients(scope: Scope, campaignId: string) {
    const campaign = await db
      .select()
      .from(outreachCampaigns)
      .where(
        and(
          eq(outreachCampaigns.id, campaignId),
          eq(outreachCampaigns.ownerId, scope.ownerId),
        ),
      )
      .get();

    if (!campaign) throw new NotFoundError("Campaign");

    // Fetch matching contacts that have at least one email
    let matchingContacts: Array<{
      contactId: string;
      name: string;
      company: string | null;
      role: string | null;
      about: string | null;
      email: string;
      tag?: string | null;
    }> = [];

    if (campaign.targetTag) {
      const tagQuery = `%${campaign.targetTag.trim().toLowerCase()}%`;
      matchingContacts = sqlite
        .prepare(
          `SELECT c.id as contactId, c.name, c.company, c.role, c.about, e.email, t.tag
           FROM contacts c
           JOIN contact_emails e ON e.contactId = c.id
           JOIN contact_tags t ON t.contactId = c.id
           WHERE c.ownerId = ? AND c.isArchived = 0 AND LOWER(t.tag) LIKE ?
           GROUP BY c.id`,
        )
        .all(scope.ownerId, tagQuery) as typeof matchingContacts;
    } else if (campaign.targetListId) {
      matchingContacts = sqlite
        .prepare(
          `SELECT c.id as contactId, c.name, c.company, c.role, c.about, e.email
           FROM contacts c
           JOIN contact_emails e ON e.contactId = c.id
           JOIN list_members lm ON lm.contactId = c.id
           WHERE c.ownerId = ? AND c.isArchived = 0 AND lm.listId = ?
           GROUP BY c.id`,
        )
        .all(scope.ownerId, campaign.targetListId) as typeof matchingContacts;
    } else {
      // All contacts with emails
      matchingContacts = sqlite
        .prepare(
          `SELECT c.id as contactId, c.name, c.company, c.role, c.about, e.email
           FROM contacts c
           JOIN contact_emails e ON e.contactId = c.id
           WHERE c.ownerId = ? AND c.isArchived = 0
           GROUP BY c.id
           LIMIT 1000`,
        )
        .all(scope.ownerId) as typeof matchingContacts;
    }

    // Insert only if not already in campaign
    const existingContactIds = new Set(
      (
        sqlite
          .prepare(
            `SELECT contactId FROM outreach_recipients WHERE campaignId = ? AND ownerId = ?`,
          )
          .pluck()
          .all(campaignId, scope.ownerId) as string[]
      ),
    );

    let added = 0;
    const insertStmt = sqlite.prepare(
      `INSERT INTO outreach_recipients 
       (id, ownerId, campaignId, contactId, toEmail, toName, company, category, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_draft')`,
    );

    sqlite.transaction(() => {
      for (const c of matchingContacts) {
        if (!c.email || existingContactIds.has(c.contactId)) continue;
        insertStmt.run(
          crypto.randomUUID(),
          scope.ownerId,
          campaignId,
          c.contactId,
          c.email,
          c.name,
          c.company || null,
          c.tag || null,
        );
        added++;
      }

      // Update totalRecipients
      sqlite
        .prepare(
          `UPDATE outreach_campaigns 
           SET totalRecipients = (SELECT COUNT(*) FROM outreach_recipients WHERE campaignId = ?),
               updatedAt = CURRENT_TIMESTAMP
           WHERE id = ? AND ownerId = ?`,
        )
        .run(campaignId, campaignId, scope.ownerId);
    })();

    return { added, total: matchingContacts.length };
  },

  // ==========================================
  // RECIPIENTS & DRAFTS
  // ==========================================

  async listRecipients(
    scope: Scope,
    campaignId: string,
    filters?: { status?: string; limit?: number; offset?: number },
  ) {
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;

    let query = `SELECT * FROM outreach_recipients WHERE campaignId = ? AND ownerId = ?`;
    const params: unknown[] = [campaignId, scope.ownerId];

    if (filters?.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }
    query += ` ORDER BY createdAt ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = sqlite.prepare(query).all(...params) as Array<
      typeof outreachRecipients.$inferSelect
    >;

    return rows;
  },

  async updateRecipient(
    scope: Scope,
    recipientId: string,
    data: { subject?: string; bodyText?: string; status?: string },
  ) {
    const recipient = sqlite
      .prepare(
        `SELECT * FROM outreach_recipients WHERE id = ? AND ownerId = ?`,
      )
      .get(recipientId, scope.ownerId) as
      | typeof outreachRecipients.$inferSelect
      | undefined;

    if (!recipient) throw new NotFoundError("Recipient");

    const updates: string[] = ["updatedAt = CURRENT_TIMESTAMP"];
    const params: unknown[] = [];

    if (data.subject !== undefined) {
      updates.push("subject = ?");
      params.push(data.subject);
    }
    if (data.bodyText !== undefined) {
      updates.push("bodyText = ?");
      params.push(data.bodyText);
    }
    if (data.status !== undefined) {
      updates.push("status = ?");
      params.push(data.status);
    }

    params.push(recipientId, scope.ownerId);

    sqlite
      .prepare(
        `UPDATE outreach_recipients SET ${updates.join(", ")} WHERE id = ? AND ownerId = ?`,
      )
      .run(...params);

    return sqlite
      .prepare(`SELECT * FROM outreach_recipients WHERE id = ? AND ownerId = ?`)
      .get(recipientId, scope.ownerId);
  },

  async approveAllDrafts(scope: Scope, campaignId: string) {
    const res = sqlite
      .prepare(
        `UPDATE outreach_recipients 
         SET status = 'approved', updatedAt = CURRENT_TIMESTAMP 
         WHERE campaignId = ? AND ownerId = ? AND status = 'draft_ready'`,
      )
      .run(campaignId, scope.ownerId);

    return { approved: res.changes };
  },

  // ==========================================
  // AI DRAFT GENERATION
  // ==========================================

  async generateDrafts(
    scope: Scope,
    campaignId: string,
    batchSize: number = 20,
  ) {
    const campaign = await db
      .select({
        campaign: outreachCampaigns,
        sender: senderProfiles,
      })
      .from(outreachCampaigns)
      .innerJoin(
        senderProfiles,
        eq(outreachCampaigns.senderId, senderProfiles.id),
      )
      .where(
        and(
          eq(outreachCampaigns.id, campaignId),
          eq(outreachCampaigns.ownerId, scope.ownerId),
        ),
      )
      .get();

    if (!campaign) throw new NotFoundError("Campaign");

    const sender = campaign.sender;
    const pendingRecipients = sqlite
      .prepare(
        `SELECT r.id, r.contactId, r.toName, r.toEmail, r.company, r.category, c.about, c.role
         FROM outreach_recipients r
         JOIN contacts c ON c.id = r.contactId
         WHERE r.campaignId = ? AND r.ownerId = ? AND r.status = 'pending_draft'
         LIMIT ?`,
      )
      .all(campaignId, scope.ownerId, batchSize) as Array<{
      id: string;
      contactId: string;
      toName: string;
      toEmail: string;
      company: string | null;
      category: string | null;
      about: string | null;
      role: string | null;
    }>;

    if (pendingRecipients.length === 0) {
      return { generated: 0, message: "Semua draf sudah dibuat!" };
    }

    let generatedCount = 0;

    for (const r of pendingRecipients) {
      try {
        const systemPrompt = `Kamu adalah perwakilan bisnis profesional untuk brand "${sender.name}".
Pengirim: ${sender.fromName} (${sender.fromEmail}).
Tujuan Bisnis / Knowledge Base Brand:
${sender.aiKnowledge || "Penyedia solusi berkualitas tinggi."}

Tone of Voice / Karakter Gaya Bahasa:
${sender.aiTone || "Hangat, profesional, to the point, dan bersahabat."}

Pantangan / Aturan Khusus (Guardrails):
${sender.aiGuardrails || "Gunakan bahasa Indonesia semi-formal yang luwes. Jangan gunakan kata-kata spam berlebihan."}

${
  sender.aiExamples
    ? `Contoh Gaya Email Sukses:\n${sender.aiExamples}`
    : ""
}

TUGAS UTAMA:
Tuliskan 1 subjek email yang menarik & personal, serta isi email (body) dingin (cold outreach) yang relevan khusus untuk calon klien ini.`;

        const userPrompt = `Target Penerima:
- Nama: ${r.toName}
- Perusahaan: ${r.company || "Perusahaan Calon Klien"}
- Jabatan/Role: ${r.role || "-"}
- Kategori Produk/Sektor: ${r.category || "-"}
- Catatan Profil: ${r.about || "-"}

Tujuan Penawaran Campaign:
${campaign.campaign.pitchGoal}

FORMAT JAWABAN HARUS JSON DENGAN KEY:
{
  "subject": "Subjek email yang menarik, tidak terpotong",
  "body": "Isi email lengkap dengan salam pembuka, personalisasi singkat terkait bisnis mereka, penawaran solusi, ajakan bertindak (Call to Action), dan salam penutup dari ${sender.fromName}"
}`;

        const aiResponse = await generateFor("quick", {
          systemPrompt,
          prompt: userPrompt,
          responseFormat: "json",
          jsonSchema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" },
            },
            required: ["subject", "body"],
          },
          model: sender.aiModel || undefined,
        });

        let subject = "Kerja Sama Bisnis";
        let body = "";

        if (aiResponse.text) {
          try {
            const parsed = JSON.parse(aiResponse.text);
            subject = parsed.subject || subject;
            body = parsed.body || aiResponse.text;
          } catch {
            body = aiResponse.text;
          }
        }

        sqlite
          .prepare(
            `UPDATE outreach_recipients 
             SET subject = ?, bodyText = ?, status = 'draft_ready', updatedAt = CURRENT_TIMESTAMP
             WHERE id = ? AND ownerId = ?`,
          )
          .run(subject.trim(), body.trim(), r.id, scope.ownerId);

        generatedCount++;
      } catch (err: unknown) {
        log.error("OutreachAI", `Failed to generate draft for ${r.toEmail}: ${err}`);
      }
    }

    return {
      generated: generatedCount,
      remaining: Math.max(0, pendingRecipients.length - generatedCount),
    };
  },

  // ==========================================
  // SENDING ENGINE (SMTP + Anti-Spam Queue)
  // ==========================================

  async sendCampaignApproved(
    scope: Scope,
    campaignId: string,
    options: { maxCount?: number } = {},
  ) {
    const campaign = await db
      .select({
        campaign: outreachCampaigns,
        sender: senderProfiles,
      })
      .from(outreachCampaigns)
      .innerJoin(
        senderProfiles,
        eq(outreachCampaigns.senderId, senderProfiles.id),
      )
      .where(
        and(
          eq(outreachCampaigns.id, campaignId),
          eq(outreachCampaigns.ownerId, scope.ownerId),
        ),
      )
      .get();

    if (!campaign) throw new NotFoundError("Campaign");

    const sender = campaign.sender;
    const maxCount = options.maxCount ?? 10;

    // Check daily limit reset
    const today = new Date().toISOString().split("T")[0];
    let sentToday = sender.lastSentDate === today ? sender.sentToday : 0;

    if (sentToday >= sender.dailyLimit) {
      throw new AppError(
        `Limit harian untuk ${sender.name} (${sender.dailyLimit} email/hari) sudah tercapai hari ini. Lanjutkan besok.`,
        429,
      );
    }

    const availableQuota = sender.dailyLimit - sentToday;
    const toSendCount = Math.min(maxCount, availableQuota);

    const approvedRecipients = sqlite
      .prepare(
        `SELECT * FROM outreach_recipients 
         WHERE campaignId = ? AND ownerId = ? AND status = 'approved'
         LIMIT ?`,
      )
      .all(campaignId, scope.ownerId, toSendCount) as Array<
      typeof outreachRecipients.$inferSelect
    >;

    if (approvedRecipients.length === 0) {
      return { sent: 0, message: "Tidak ada draf dengan status 'approved'" };
    }

    // Decrypt password
    const password = open(sender.smtpPasswordSealed);

    const transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: Boolean(sender.smtpSecure),
      auth: {
        user: sender.smtpUser,
        pass: password,
      },
      connectionTimeout: 15000,
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const r of approvedRecipients) {
      try {
        const mailOptions = {
          from: `"${sender.fromName}" <${sender.fromEmail}>`,
          to: r.toEmail,
          replyTo: sender.replyTo || sender.fromEmail,
          subject: r.subject || "Penawaran Kerja Sama",
          text: r.bodyText || "",
        };

        await transporter.sendMail(mailOptions);

        const now = new Date().toISOString();

        // 1. Mark recipient as sent
        sqlite
          .prepare(
            `UPDATE outreach_recipients 
             SET status = 'sent', sentAt = ?, updatedAt = CURRENT_TIMESTAMP
             WHERE id = ? AND ownerId = ?`,
          )
          .run(now, r.id, scope.ownerId);

        // 2. Sync to CRM Contact Interaction timeline
        try {
          interactionService.createInteraction(scope, r.contactId, {
            type: "email",
            title: `[Outreach: ${campaign.campaign.name}] ${r.subject}`,
            content: r.bodyText || undefined,
            date: now,
            source: "campaign",
          });
        } catch (crmErr) {
          log.warn("OutreachCRM", `Failed to record CRM interaction: ${crmErr}`);
        }

        sentCount++;
        sentToday++;

        // Delay between emails (anti-spam rate limit)
        if (campaign.campaign.delaySeconds > 0) {
          await sleep(campaign.campaign.delaySeconds * 1000);
        }
      } catch (sendErr: unknown) {
        failedCount++;
        const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
        sqlite
          .prepare(
            `UPDATE outreach_recipients 
             SET status = 'failed', errorMessage = ?, updatedAt = CURRENT_TIMESTAMP
             WHERE id = ? AND ownerId = ?`,
          )
          .run(errMsg, r.id, scope.ownerId);
      }
    }

    // Update sender sentToday
    sqlite
      .prepare(
        `UPDATE sender_profiles 
         SET sentToday = ?, lastSentDate = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ? AND ownerId = ?`,
      )
      .run(sentToday, today, sender.id, scope.ownerId);

    // Update campaign counters
    sqlite
      .prepare(
        `UPDATE outreach_campaigns 
         SET sentCount = sentCount + ?, failedCount = failedCount + ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ? AND ownerId = ?`,
      )
      .run(sentCount, failedCount, campaignId, scope.ownerId);

    return {
      sent: sentCount,
      failed: failedCount,
      remainingApproved: Math.max(0, approvedRecipients.length - sentCount),
    };
  },

  // ==========================================
  // IMAP HOSTINGER INBOX & SMART REPLY ASSISTANT
  // ==========================================

  async checkIncomingReplies(scope: Scope, senderId: string) {
    const sender = await db
      .select()
      .from(senderProfiles)
      .where(
        and(
          eq(senderProfiles.id, senderId),
          eq(senderProfiles.ownerId, scope.ownerId),
        ),
      )
      .get();

    if (!sender) throw new NotFoundError("Sender profile");
    if (!sender.imapHost) {
      throw new ValidationError(
        "IMAP Host belum dikonfigurasi untuk profil ini. Isi imap.hostinger.com di pengaturan profil.",
      );
    }

    const password = open(sender.smtpPasswordSealed);

    const client = new ImapFlow({
      host: sender.imapHost,
      port: sender.imapPort ?? 993,
      secure: sender.imapSecure === 1,
      auth: {
        user: sender.smtpUser,
        pass: password,
      },
      logger: false,
    });

    let matchedReplies = 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");

      try {
        // Fetch recent messages from the past 7 days
        const messages = client.fetch(
          { seen: false },
          { envelope: true, source: true, bodyStructure: true },
        );

        for await (const msg of messages) {
          const fromEmail = msg.envelope?.from?.[0]?.address?.toLowerCase();
          if (!fromEmail) continue;

          // Check if this fromEmail matches any recipient we previously sent an email to!
          const recipient = sqlite
            .prepare(
              `SELECT r.*, c.name as contactName, c.company as contactCompany
               FROM outreach_recipients r
               JOIN contacts c ON c.id = r.contactId
               WHERE LOWER(r.toEmail) = ? AND r.status = 'sent' AND r.ownerId = ?
               ORDER BY r.sentAt DESC
               LIMIT 1`,
            )
            .get(fromEmail, scope.ownerId) as
            | (typeof outreachRecipients.$inferSelect & {
                contactName: string;
                contactCompany: string | null;
              })
            | undefined;

          if (recipient) {
            const subject = msg.envelope?.subject || "Re: Penawaran";
            const replySnippet = `Balasan dari ${fromEmail} (${subject})`;
            const now = new Date().toISOString();

            // Generate AI Draft Reply based on Brand Persona
            let aiReplyDraft = "";
            try {
              const aiPrompt = `Brand: ${sender.name} (${sender.fromName})
Knowledge Base: ${sender.aiKnowledge || "-"}
Tone of Voice: ${sender.aiTone || "Hangat dan profesional"}
Guardrails: ${sender.aiGuardrails || "-"}

Klien: ${recipient.contactName} (${recipient.contactCompany || "Calon Klien"})
Email Balasan Klien:
Subjek: ${subject}
Isi: ${replySnippet}

TUGAS:
Tulis draf respons balasan yang sopan, ramah, dan membantu. Tawarkan info lanjutan / katalog / jadwal meeting santai.`;

              const aiRes = await generateFor("quick", {
                prompt: aiPrompt,
                responseFormat: "text",
                model: sender.aiModel || undefined,
              });
              aiReplyDraft = aiRes.text || "";
            } catch (err) {
              log.warn("OutreachReplyAI", `Failed to generate reply draft: ${err}`);
            }

            // Update recipient status to 'replied'
            sqlite
              .prepare(
                `UPDATE outreach_recipients 
                 SET status = 'replied', repliedAt = ?, replyText = ?, aiDraftReply = ?, updatedAt = CURRENT_TIMESTAMP
                 WHERE id = ? AND ownerId = ?`,
              )
              .run(now, replySnippet, aiReplyDraft, recipient.id, scope.ownerId);

            // Record incoming interaction in CRM
            try {
              interactionService.createInteraction(scope, recipient.contactId, {
                type: "email",
                title: `[Balasan Klien] ${subject}`,
                content: replySnippet,
                date: now,
                source: "inbox_sync",
              });
            } catch {
              // ignore
            }

            matchedReplies++;
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppError(`Gagal menghubungkan IMAP Hostinger: ${msg}`, 400);
    }

    return {
      success: true,
      matchedReplies,
      message: `Pemeriksaan inbox selesai. Ditemukan ${matchedReplies} balasan dari calon klien.`,
    };
  },
};

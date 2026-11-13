// =============================================================================
// Migration 0002_sender_profiles_and_campaigns
// =============================================================================
// Adds sender_profiles, outreach_campaigns, and outreach_recipients tables
// for multi-brand SMTP settings, AI knowledge personas, and outreach campaigns.
// =============================================================================

import type Database from "better-sqlite3";

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE sender_profiles (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      fromName TEXT NOT NULL,
      fromEmail TEXT NOT NULL,
      replyTo TEXT,
      smtpHost TEXT NOT NULL,
      smtpPort INTEGER NOT NULL DEFAULT 465,
      smtpSecure INTEGER NOT NULL DEFAULT 1,
      smtpUser TEXT NOT NULL,
      smtpPasswordSealed TEXT NOT NULL,
      imapHost TEXT,
      imapPort INTEGER DEFAULT 993,
      imapSecure INTEGER DEFAULT 1,
      dailyLimit INTEGER NOT NULL DEFAULT 100,
      sentToday INTEGER NOT NULL DEFAULT 0,
      lastSentDate TEXT,
      aiKnowledge TEXT,
      aiTone TEXT,
      aiExamples TEXT,
      aiGuardrails TEXT,
      aiModel TEXT,
      createdAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE INDEX idx_sender_profiles_owner ON sender_profiles(ownerId);
    CREATE TRIGGER sender_profiles_owner_required BEFORE INSERT ON sender_profiles
      WHEN NEW.ownerId IS NULL
      BEGIN SELECT RAISE(ABORT, 'sender_profiles.ownerId is required'); END;

    CREATE TABLE outreach_campaigns (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      senderId TEXT NOT NULL REFERENCES sender_profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      targetTag TEXT,
      targetListId TEXT REFERENCES lists(id) ON DELETE SET NULL,
      pitchGoal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      delaySeconds INTEGER NOT NULL DEFAULT 20,
      totalRecipients INTEGER NOT NULL DEFAULT 0,
      sentCount INTEGER NOT NULL DEFAULT 0,
      failedCount INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE INDEX idx_outreach_campaigns_owner ON outreach_campaigns(ownerId);
    CREATE TRIGGER outreach_campaigns_owner_required BEFORE INSERT ON outreach_campaigns
      WHEN NEW.ownerId IS NULL
      BEGIN SELECT RAISE(ABORT, 'outreach_campaigns.ownerId is required'); END;

    CREATE TABLE outreach_recipients (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      campaignId TEXT NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
      contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      toEmail TEXT NOT NULL,
      toName TEXT,
      company TEXT,
      category TEXT,
      subject TEXT,
      bodyText TEXT,
      bodyHtml TEXT,
      status TEXT NOT NULL DEFAULT 'pending_draft',
      errorMessage TEXT,
      sentAt TEXT,
      repliedAt TEXT,
      replyText TEXT,
      aiDraftReply TEXT,
      createdAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE INDEX idx_outreach_recipients_owner ON outreach_recipients(ownerId);
    CREATE INDEX idx_outreach_recipients_campaign ON outreach_recipients(campaignId, status);
    CREATE TRIGGER outreach_recipients_owner_required BEFORE INSERT ON outreach_recipients
      WHEN NEW.ownerId IS NULL
      BEGIN SELECT RAISE(ABORT, 'outreach_recipients.ownerId is required'); END;
  `);
}

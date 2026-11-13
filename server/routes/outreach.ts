import { Router } from "express";
import { log } from "../utils/logger.ts";
import { outreachService } from "../services/outreachService.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { scopeOf } from "../tenancy/scope.ts";

export const outreachRouter = Router();

// ==========================================
// SENDER PROFILES
// ==========================================

outreachRouter.get(
  "/senders",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const senders = await outreachService.listSenderProfiles(scope);
    res.json(senders);
  }),
);

outreachRouter.get(
  "/senders/:id",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const sender = await outreachService.getSenderProfile(
      scope,
      String(req.params.id),
    );
    res.json(sender);
  }),
);

outreachRouter.post(
  "/senders",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const sender = await outreachService.createSenderProfile(scope, req.body);
    log.info("Outreach", `Created sender profile ${sender.id} (${sender.name})`);
    res.status(201).json(sender);
  }),
);

outreachRouter.patch(
  "/senders/:id",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const updated = await outreachService.updateSenderProfile(
      scope,
      String(req.params.id),
      req.body,
    );
    log.info("Outreach", `Updated sender profile ${updated.id}`);
    res.json(updated);
  }),
);

outreachRouter.delete(
  "/senders/:id",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    await outreachService.deleteSenderProfile(scope, String(req.params.id));
    log.info("Outreach", `Deleted sender profile ${String(req.params.id)}`);
    res.json({ success: true });
  }),
);

outreachRouter.post(
  "/senders/test",
  asyncHandler(async (req, res) => {
    const result = await outreachService.testSmtp(req.body);
    res.json(result);
  }),
);

outreachRouter.post(
  "/senders/:id/sync-replies",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const result = await outreachService.checkIncomingReplies(
      scope,
      String(req.params.id),
    );
    res.json(result);
  }),
);

// ==========================================
// CAMPAIGNS
// ==========================================

outreachRouter.get(
  "/campaigns",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const campaigns = await outreachService.listCampaigns(scope);
    res.json(campaigns);
  }),
);

outreachRouter.get(
  "/campaigns/:id",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const campaign = await outreachService.getCampaign(
      scope,
      String(req.params.id),
    );
    res.json(campaign);
  }),
);

outreachRouter.post(
  "/campaigns",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const campaign = await outreachService.createCampaign(scope, req.body);
    log.info("Outreach", `Created campaign ${campaign.id} (${campaign.name})`);
    res.status(201).json(campaign);
  }),
);

outreachRouter.delete(
  "/campaigns/:id",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    await outreachService.deleteCampaign(scope, String(req.params.id));
    log.info("Outreach", `Deleted campaign ${String(req.params.id)}`);
    res.json({ success: true });
  }),
);

outreachRouter.post(
  "/campaigns/:id/populate",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const result = await outreachService.populateRecipients(
      scope,
      String(req.params.id),
    );
    res.json(result);
  }),
);

outreachRouter.get(
  "/campaigns/:id/recipients",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const status = req.query.status ? String(req.query.status) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const recipients = await outreachService.listRecipients(
      scope,
      String(req.params.id),
      { status, limit, offset },
    );
    res.json(recipients);
  }),
);

outreachRouter.patch(
  "/recipients/:id",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const updated = await outreachService.updateRecipient(
      scope,
      String(req.params.id),
      req.body,
    );
    res.json(updated);
  }),
);

outreachRouter.post(
  "/campaigns/:id/generate-drafts",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const batchSize = req.body.batchSize ? Number(req.body.batchSize) : 20;
    const result = await outreachService.generateDrafts(
      scope,
      String(req.params.id),
      batchSize,
    );
    res.json(result);
  }),
);

outreachRouter.post(
  "/campaigns/:id/approve-all",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const result = await outreachService.approveAllDrafts(
      scope,
      String(req.params.id),
    );
    res.json(result);
  }),
);

outreachRouter.post(
  "/campaigns/:id/send",
  asyncHandler(async (req, res) => {
    const scope = scopeOf(req);
    const maxCount = req.body.maxCount ? Number(req.body.maxCount) : 10;
    const result = await outreachService.sendCampaignApproved(
      scope,
      String(req.params.id),
      { maxCount },
    );
    res.json(result);
  }),
);

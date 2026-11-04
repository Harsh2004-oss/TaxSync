const express = require("express");
const whatsappRouter = require("./whatsapp");

const router = express.Router();
const chaseStore = whatsappRouter.chaseStore;

/**
 * GET /api/vendor/:token
 * Fetch vendor portal data by token (used by frontend vendor portal page)
 */
router.get("/:token", (req, res) => {
  const chase = chaseStore[req.params.token];
  if (!chase) {
    return res.status(404).json({ error: "Invalid or expired link. Please contact your buyer." });
  }
  res.json({
    token: chase.token,
    vendorName: chase.vendorName,
    invoiceNo: chase.invoiceNo,
    taxAmount: chase.taxAmount,
    buyerName: chase.buyerName,
    vendorResponse: chase.vendorResponse,
    status: chase.status,
    createdAt: chase.createdAt,
  });
});

/**
 * POST /api/vendor/:token/respond
 * Vendor submits their resolution choice
 * Options: 'filed_late' | 'typo' | 'upload_copy'
 */
router.post("/:token/respond", (req, res) => {
  const chase = chaseStore[req.params.token];
  if (!chase) {
    return res.status(404).json({ error: "Invalid or expired link." });
  }

  const { action, correctedInvNo, notes } = req.body;
  const validActions = ["filed_late", "typo", "upload_copy"];

  if (!action || !validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Choose from: ${validActions.join(", ")}` });
  }

  const actionLabels = {
    filed_late: "Will file in next return",
    typo: "Invoice number typo — will correct",
    upload_copy: "Uploading bill copy",
  };

  chase.vendorResponse = {
    action,
    actionLabel: actionLabels[action],
    correctedInvNo: correctedInvNo || null,
    notes: notes || null,
    respondedAt: new Date().toISOString(),
  };
  chase.status = "RESPONDED";

  console.log(`[Vendor Portal] Token ${req.params.token} — Vendor responded: ${action}`);

  res.json({
    success: true,
    message: "Thank you! Your response has been sent to the buyer. No further action needed from your side.",
    action,
    actionLabel: actionLabels[action],
  });
});

module.exports = router;

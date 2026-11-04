const express = require("express");
const { v4: uuidv4 } = require("uuid");
const uploadRouter = require("./upload");

const router = express.Router();
const sessionStore = uploadRouter.sessionStore;

// In-memory WhatsApp chase token store
// token -> { invoiceData, status, vendorResponse, createdAt }
const chaseStore = {};

/**
 * POST /api/whatsapp/chase
 * Trigger a WhatsApp chaser for a missing invoice
 * Runs in MOCK MODE — simulates API call for demo
 */
router.post("/chase", (req, res) => {
  try {
    const { vendorName, invoiceNo, taxAmount, buyerName, vendorMobile, sessionId, invoiceIndex } = req.body;

    if (!vendorMobile || !invoiceNo) {
      return res.status(400).json({ error: "vendorMobile and invoiceNo are required" });
    }

    // Generate unique token for vendor portal
    const token = uuidv4().replace(/-/g, "").substring(0, 12);

    // Store chase data
    const chaseData = {
      token,
      vendorName: vendorName || "Vendor",
      invoiceNo,
      taxAmount,
      buyerName: buyerName || "Our Company",
      vendorMobile,
      invoiceIndex,
      sessionId: sessionId || "default",
      status: "SENT",
      whatsappStatus: "delivered",
      createdAt: new Date().toISOString(),
      vendorResponse: null,
      vendorPortalUrl: `/v/${token}`,
    };

    chaseStore[token] = chaseData;

    // Update session results with chase info
    const sid = sessionId || "default";
    if (sessionStore[sid] && sessionStore[sid].reconciliationResults && invoiceIndex !== undefined) {
      const result = sessionStore[sid].reconciliationResults[invoiceIndex];
      if (result) {
        result.whatsappChased = true;
        result.whatsappToken = token;
        result.whatsappStatus = "delivered";
      }
    }

    // Simulate WhatsApp template message payload (mock)
    const mockPayload = {
      to: `+91${vendorMobile}`,
      type: "template",
      template: {
        name: "itc_vendor_chaser_v1",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: vendorName },
              { type: "text", text: invoiceNo },
              { type: "text", text: `₹${Number(taxAmount).toLocaleString("en-IN")}` },
              { type: "text", text: buyerName },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: token }],
          },
        ],
      },
    };

    console.log(`[MOCK WhatsApp] Sending to +91${vendorMobile}:`, JSON.stringify(mockPayload, null, 2));

    res.json({
      success: true,
      mock: true,
      token,
      vendorPortalUrl: `/v/${token}`,
      message: `WhatsApp chaser sent to +91${vendorMobile} for invoice ${invoiceNo} (MOCK MODE)`,
      payload: mockPayload,
      deliveryStatus: "delivered",
    });
  } catch (err) {
    console.error("WhatsApp chase error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/whatsapp/status/:token
 * Check delivery/response status of a chase
 */
router.get("/status/:token", (req, res) => {
  const chase = chaseStore[req.params.token];
  if (!chase) {
    return res.status(404).json({ error: "Chase token not found" });
  }
  res.json(chase);
});

/**
 * GET /api/whatsapp/chases
 * List all active chases for current session
 */
router.get("/chases", (req, res) => {
  const sessionId = req.headers["x-session-id"] || "default";
  const sessionChases = Object.values(chaseStore).filter((c) => c.sessionId === sessionId);
  res.json({ chases: sessionChases });
});

module.exports = router;
module.exports.chaseStore = chaseStore;

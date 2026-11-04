const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { parseTallyCSV } = require("../utils/csvParser");
const { parseGSTR2B } = require("../utils/gstr2bParser");

const router = express.Router();

// In-memory session store (MVP — per-session store)
// In production, use Redis or DB
const sessionStore = {};

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [".csv", ".json", ".xlsx", ".xls"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Use CSV or JSON.`));
    }
  },
});

/**
 * POST /api/upload/tally
 * Upload and parse Tally Purchase Register CSV
 */
router.post("/tally", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const csvText = req.file.buffer.toString("utf-8");
    const invoices = parseTallyCSV(csvText);

    if (!invoices || invoices.length === 0) {
      return res.status(400).json({ error: "No invoices found in CSV. Check column headers." });
    }

    // Store in session
    const sessionId = req.headers["x-session-id"] || "default";
    if (!sessionStore[sessionId]) sessionStore[sessionId] = {};
    sessionStore[sessionId].tallyInvoices = invoices;
    sessionStore[sessionId].tallyFilename = req.file.originalname;

    res.json({
      success: true,
      filename: req.file.originalname,
      count: invoices.length,
      invoices,
    });
  } catch (err) {
    console.error("Tally upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/upload/gstr2b
 * Upload and parse GSTR-2B JSON file
 */
router.post("/gstr2b", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const jsonText = req.file.buffer.toString("utf-8");
    let jsonData;
    try {
      jsonData = JSON.parse(jsonText);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON file. Check that it is a valid GSTR-2B export." });
    }

    const invoices = parseGSTR2B(jsonData);

    if (!invoices || invoices.length === 0) {
      return res.status(400).json({ error: "No invoices found in GSTR-2B JSON. Check file format." });
    }

    // Store in session
    const sessionId = req.headers["x-session-id"] || "default";
    if (!sessionStore[sessionId]) sessionStore[sessionId] = {};
    sessionStore[sessionId].gstr2bInvoices = invoices;
    sessionStore[sessionId].gstr2bFilename = req.file.originalname;
    sessionStore[sessionId].gstr2bMeta = {
      buyerGSTIN: jsonData.gstin || jsonData.data?.gstin,
      filingPeriod: jsonData.fp || jsonData.data?.fp,
    };

    res.json({
      success: true,
      filename: req.file.originalname,
      count: invoices.length,
      meta: sessionStore[sessionId].gstr2bMeta,
      invoices,
    });
  } catch (err) {
    console.error("GSTR-2B upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Inline Demo Data (works on any host — no filesystem dependency) ──────────
const DEMO_CSV = `Date,Particulars,GSTIN/UIN,Voucher No,Supplier Inv No,Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Total Tax,Invoice Value,Purchase Ledger,Vendor Mobile
02-10-2026,Precision Tools Co,23AABCP1234D1ZM,PUR/001,PT/26-27/550,100000,0,9000,9000,18000,118000,Raw Material Purchase,9826111111
05-10-2026,National Transport,23AABCN9876E1ZL,PUR/002,INV-4402,20000,3600,0,0,3600,23600,Freight Inward,9826222222
08-10-2026,Bansal Sweets & Snacks,23AABCB5555F1ZK,PUR/003,BS/OCT/012,15000,0,1350,1350,2700,17700,Staff Welfare Expenses,9826333333
12-10-2026,Agarwal Packaging,23AABCA3333G1ZJ,PUR/004,AP/089,45000,0,4050,4050,8100,53100,Packing Material,9826444444
18-10-2026,City Car Maintenance,23AABCC7777H1ZI,PUR/005,CCM/998,12000,0,1080,1080,2160,14160,Vehicle Repair & Maint,9826555555`;

const DEMO_GSTR2B = {
  gstin: "23BUYER9999K1ZP",
  fp: "102026",
  b2b: [
    { ctin: "23AABCP1234D1ZM", inv: [{ inum: "PT/26-27/550", dt: "02-10-2026", val: 118000.0, itcavl: "Y", items: [{ txval: 100000.0, iamt: 0.0, camt: 9000.0, samt: 9000.0 }] }] },
    { ctin: "23AABCA3333G1ZJ", inv: [{ inum: "089", dt: "11-10-2026", val: 53100.0, itcavl: "Y", items: [{ txval: 45000.0, iamt: 0.0, camt: 4050.0, samt: 4050.0 }] }] },
    { ctin: "23AABCB5555F1ZK", inv: [{ inum: "BS/OCT/012", dt: "08-10-2026", val: 17700.0, itcavl: "Y", items: [{ txval: 15000.0, iamt: 0.0, camt: 1350.0, samt: 1350.0 }] }] },
  ],
};

/**
 * POST /api/upload/demo
 * Load built-in sample test data (no file upload needed, works on all hosts)
 */
router.post("/demo", (req, res) => {
  try {
    const tallyInvoices = parseTallyCSV(DEMO_CSV);
    const gstr2bInvoices = parseGSTR2B(DEMO_GSTR2B);

    const sessionId = req.headers["x-session-id"] || "default";
    if (!sessionStore[sessionId]) sessionStore[sessionId] = {};
    sessionStore[sessionId].tallyInvoices = tallyInvoices;
    sessionStore[sessionId].gstr2bInvoices = gstr2bInvoices;
    sessionStore[sessionId].tallyFilename = "test_tally_pr.csv (Demo)";
    sessionStore[sessionId].gstr2bFilename = "test_gstr2b.json (Demo)";
    sessionStore[sessionId].gstr2bMeta = { buyerGSTIN: DEMO_GSTR2B.gstin, filingPeriod: DEMO_GSTR2B.fp };

    res.json({
      success: true,
      tallyCount: tallyInvoices.length,
      gstr2bCount: gstr2bInvoices.length,
      tallyInvoices,
      gstr2bInvoices,
    });
  } catch (err) {
    console.error("Demo load error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Export sessionStore for use in other routes
module.exports = router;
module.exports.sessionStore = sessionStore;

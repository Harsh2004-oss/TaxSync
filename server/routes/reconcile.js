const express = require("express");
const ExcelJS = require("exceljs");
const { reconcile } = require("../engines/reconciler");
const uploadRouter = require("./upload");

const router = express.Router();

// Access shared session store
const sessionStore = uploadRouter.sessionStore;

/**
 * POST /api/reconcile
 * Run the full 4-tier reconciliation engine on uploaded data
 */
router.post("/", (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"] || "default";
    const session = sessionStore[sessionId];

    if (!session || !session.tallyInvoices) {
      return res.status(400).json({ error: "Tally data not uploaded. Please upload Tally Purchase Register first." });
    }
    if (!session.gstr2bInvoices) {
      return res.status(400).json({ error: "GSTR-2B data not uploaded. Please upload GSTR-2B JSON first." });
    }

    const { results, summary } = reconcile(session.tallyInvoices, session.gstr2bInvoices);

    // Store results in session for export
    session.reconciliationResults = results;
    session.reconciliationSummary = summary;

    res.json({
      success: true,
      summary,
      results,
      meta: {
        tallyFilename: session.tallyFilename,
        gstr2bFilename: session.gstr2bFilename,
        gstr2bMeta: session.gstr2bMeta,
        runAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Reconciliation error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/reconcile/direct
 * Run reconciliation directly with provided data (no session needed)
 */
router.post("/direct", (req, res) => {
  try {
    const { tallyInvoices, gstr2bInvoices } = req.body;
    if (!tallyInvoices || !gstr2bInvoices) {
      return res.status(400).json({ error: "tallyInvoices and gstr2bInvoices are required" });
    }
    const { results, summary } = reconcile(tallyInvoices, gstr2bInvoices);
    res.json({ success: true, summary, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/reconcile/export
 * Export reconciliation results as XLSX with color-coded status rows
 */
router.get("/export", async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"] || "default";
    const session = sessionStore[sessionId];

    if (!session || !session.reconciliationResults) {
      return res.status(400).json({ error: "No reconciliation results to export. Run reconciliation first." });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TaxSync AI";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("ITC Reconciliation Report", {
      pageSetup: { paperSize: 9, orientation: "landscape" },
    });

    // Color map
    const STATUS_COLORS = {
      MATCHED: { bg: "FF22C55E", font: "FFFFFFFF" },
      FUZZY: { bg: "FFEAB308", font: "FF000000" },
      BLOCKED: { bg: "FFA855F7", font: "FFFFFFFF" },
      MISSING: { bg: "FFEF4444", font: "FFFFFFFF" },
    };

    // Header row
    const headers = [
      "Bill No (Tally)", "Vendor", "GSTIN", "Date", "Taxable Value",
      "IGST", "CGST", "SGST", "Total Tax", "Invoice Value",
      "Purchase Ledger", "Status", "Match Type", "Legal Action / Note",
      "GSTR-3B Action", "Vendor Mobile"
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "thin", color: { argb: "FF334155" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } },
      };
    });
    headerRow.height = 30;

    // Data rows
    for (const r of session.reconciliationResults) {
      const row = sheet.addRow([
        r.supplierInvNo,
        r.particulars,
        r.gstin,
        r.date,
        r.taxableValue,
        r.igst,
        r.cgst,
        r.sgst,
        r.totalTax,
        r.invoiceValue,
        r.purchaseLedger,
        r.statusLabel,
        r.matchType === "exact" ? "Exact" : r.matchType === "fuzzy" ? "Fuzzy/Normalized" : "—",
        r.legalAction,
        r.gstr3bAction,
        r.vendorMobile,
      ]);

      const colors = STATUS_COLORS[r.status] || { bg: "FFFFFFFF", font: "FF000000" };
      row.eachCell((cell, colNum) => {
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        // Color the Status column (col 12) with full status color
        if (colNum === 12) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.bg } };
          cell.font = { bold: true, color: { argb: colors.font } };
        }
        // Light tint on numeric columns for eligible rows
        if ([5, 6, 7, 8, 9, 10].includes(colNum) && (r.status === "MATCHED" || r.status === "FUZZY")) {
          cell.font = { color: { argb: "FF15803D" }, bold: true };
        }
      });
      row.height = 25;
    }

    // Summary sheet
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.addRow(["TaxSync AI — GSTR-3B ITC Summary Report"]).getCell(1).font = { bold: true, size: 14 };
    summarySheet.addRow([]);
    const meta = session.gstr2bMeta || {};
    summarySheet.addRow(["Buyer GSTIN", meta.buyerGSTIN || "—"]);
    summarySheet.addRow(["Filing Period", meta.filingPeriod || "—"]);
    summarySheet.addRow(["Generated At", new Date().toLocaleString("en-IN")]);
    summarySheet.addRow([]);
    summarySheet.addRow(["Category", "Count", "ITC Amount (₹)"]);
    const s = session.reconciliationSummary;
    summarySheet.addRow(["✅ Eligible (Exact Match)", s.eligibleCount, s.eligibleITC]);
    summarySheet.addRow(["🟡 Fuzzy Match (Verify)", s.fuzzyCount, 0]);
    summarySheet.addRow(["🟣 Section 17(5) Blocked", s.blockedCount, s.blockedITC]);
    summarySheet.addRow(["🔴 Missing in GSTR-2B", s.missingCount, s.missingITC]);
    summarySheet.addRow([]);
    summarySheet.addRow(["NET CLAIMABLE ITC", "", s.eligibleITC]).getCell(1).font = { bold: true, size: 12 };

    // Column widths
    sheet.columns = [
      { width: 18 }, { width: 24 }, { width: 18 }, { width: 14 },
      { width: 14 }, { width: 10 }, { width: 10 }, { width: 10 },
      { width: 12 }, { width: 14 }, { width: 22 }, { width: 16 },
      { width: 18 }, { width: 45 }, { width: 30 }, { width: 14 },
    ];

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="TaxSync_ITC_Report_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

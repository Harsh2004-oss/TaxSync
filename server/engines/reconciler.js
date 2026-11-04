/**
 * Main Reconciliation Orchestrator
 * Runs 4-tier matching: Exact Match → Fuzzy Match → Section 17(5) Block → Missing in 2B
 */
const { normalizeInvoiceNumber, normalizeGSTIN } = require("./normalizer");
const { matchInvoiceNumbers } = require("./matcher");
const { checkSection175Ineligibility } = require("./section175");

/**
 * Build a lookup map from GSTR-2B data keyed by [GSTIN + normalized_inv_num]
 */
function build2BLookup(gstr2bInvoices) {
  const lookup = new Map();
  for (const inv of gstr2bInvoices) {
    const gstin = normalizeGSTIN(inv.ctin);
    const normInv = normalizeInvoiceNumber(inv.inum);
    const key = `${gstin}::${normInv}`;
    lookup.set(key, inv);
  }
  return lookup;
}

/**
 * Core reconciliation function
 * @param {Array} tallyInvoices - Parsed Tally invoices
 * @param {Array} gstr2bInvoices - Flattened GSTR-2B invoices (each with ctin)
 * @returns {Array} reconciliation results
 */
function reconcile(tallyInvoices, gstr2bInvoices) {
  const lookup2B = build2BLookup(gstr2bInvoices);
  const results = [];

  for (const tally of tallyInvoices) {
    const result = {
      // Tally source fields
      date: tally.date,
      particulars: tally.particulars,
      gstin: tally.gstin,
      voucherNo: tally.voucherNo,
      supplierInvNo: tally.supplierInvNo,
      taxableValue: tally.taxableValue,
      igst: tally.igst,
      cgst: tally.cgst,
      sgst: tally.sgst,
      totalTax: tally.totalTax,
      invoiceValue: tally.invoiceValue,
      purchaseLedger: tally.purchaseLedger,
      vendorMobile: tally.vendorMobile,
      // Result fields
      status: null,
      statusLabel: null,
      statusColor: null,
      matched2BInv: null,
      matchScore: null,
      matchType: null,
      section175: null,
      legalAction: null,
      gstr3bAction: null,
      whatsappChased: false,
      whatsappToken: null,
      vendorResponse: null,
    };

    const normalizedTallyGSTIN = normalizeGSTIN(tally.gstin);
    const normalizedTallyInv = normalizeInvoiceNumber(tally.supplierInvNo);

    // Step 1: Check Section 17(5) FIRST (overrides even matched status)
    const sec175 = checkSection175Ineligibility(tally.purchaseLedger);
    result.section175 = sec175;

    // Step 2: Try to find in GSTR-2B
    // Try exact key first
    const exactKey = `${normalizedTallyGSTIN}::${normalizedTallyInv}`;
    let matched2B = null;
    let matchType = "none";
    let matchScore = 0;

    if (lookup2B.has(exactKey)) {
      matched2B = lookup2B.get(exactKey);
      matchType = "exact";
      matchScore = 1.0;
    } else {
      // Fuzzy search: find all 2B invoices for same GSTIN, then fuzzy match inv numbers
      for (const [key, inv2b] of lookup2B.entries()) {
        const [inv2bGSTIN, inv2bNormInv] = key.split("::");
        if (inv2bGSTIN !== normalizedTallyGSTIN) continue;

        const matchResult = matchInvoiceNumbers(normalizedTallyInv, inv2bNormInv, 0.60);
        if (matchResult.matched && matchResult.score > matchScore) {
          matched2B = inv2b;
          matchType = matchResult.type;
          matchScore = matchResult.score;
        }
      }
    }

    result.matched2BInv = matched2B;
    result.matchType = matchType;
    result.matchScore = matchScore;

    // Step 3: Determine final status
    if (sec175.isBlocked) {
      // Purple — blocked regardless of 2B match
      result.status = "BLOCKED";
      result.statusLabel = "Blocked ITC";
      result.statusColor = "purple";
      result.legalAction = `⚠️ ${sec175.clause} — ${sec175.description}. Do NOT claim in GSTR-3B Table 4(A).`;
      result.gstr3bAction = `Move to Table ${sec175.gstr3bTable} — Ineligible ITC`;
    } else if (matched2B && matchType === "exact") {
      // Green — exact match, eligible
      result.status = "MATCHED";
      result.statusLabel = "Exact Match";
      result.statusColor = "green";
      result.legalAction = "100% Eligible under Section 16(2). Claim in GSTR-3B Table 4(A).";
      result.gstr3bAction = "Table 4(A)(5) — ITC Available";
    } else if (matched2B && matchType === "fuzzy") {
      // Yellow — fuzzy/normalized match
      result.status = "FUZZY";
      result.statusLabel = "Fuzzy Match";
      result.statusColor = "yellow";
      result.legalAction = `Normalized match (score: ${(matchScore * 100).toFixed(0)}%). Verify invoice number discrepancy with vendor. VLOOKUP would fail on this.`;
      result.gstr3bAction = "Table 4(A)(5) — ITC Available (verify before filing)";
    } else {
      // Red — missing in 2B
      result.status = "MISSING";
      result.statusLabel = "Missing in 2B";
      result.statusColor = "red";
      result.legalAction = `Critical ITC Leakage! ₹${result.totalTax.toLocaleString("en-IN")} blocked. Vendor has not filed GSTR-1. Send WhatsApp reminder.`;
      result.gstr3bAction = "Cannot claim — Vendor GSTR-1 pending";
    }

    results.push(result);
  }

  // Summary stats
  const summary = {
    total: results.length,
    eligibleCount: results.filter((r) => r.status === "MATCHED").length,
    fuzzyCount: results.filter((r) => r.status === "FUZZY").length,
    blockedCount: results.filter((r) => r.status === "BLOCKED").length,
    missingCount: results.filter((r) => r.status === "MISSING").length,
    eligibleITC: results.filter((r) => r.status === "MATCHED" || r.status === "FUZZY").reduce((s, r) => s + (r.totalTax || 0), 0),
    blockedITC: results.filter((r) => r.status === "BLOCKED").reduce((s, r) => s + (r.totalTax || 0), 0),
    missingITC: results.filter((r) => r.status === "MISSING").reduce((s, r) => s + (r.totalTax || 0), 0),
  };

  return { results, summary };
}

module.exports = { reconcile };

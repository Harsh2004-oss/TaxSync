/**
 * Invoice Number Normalizer
 * Strips prefixes, special chars, and leading zeroes for cross-system matching.
 * E.g., "INV/2026/089" -> "89", "PT/26-27/550" -> "550", "0045" -> "45"
 */
function normalizeInvoiceNumber(rawInv) {
  if (!rawInv) return "";
  let clean = rawInv.toString().trim().toUpperCase();

  // Remove special characters, slashes, hyphens, underscores, and whitespace
  clean = clean.replace(/[\/\s\-_\.]/g, "");

  // Remove common static prefixes (order matters: longer first)
  clean = clean.replace(/^(BILL|TAXINV|INVOICE|GSTIN|FY\d{2,4}|INV|TAX|GST)/g, "");

  // Remove year patterns like 2026, 2627, 26-27
  clean = clean.replace(/^(20\d{2}|2\d{3}|\d{4})/g, "");

  // Strip remaining leading zeroes but keep if all-zero
  clean = clean.replace(/^0+([1-9])/, "$1");

  return clean || rawInv.toString().trim().toUpperCase();
}

/**
 * Normalize GSTIN — uppercase, trim whitespace
 */
function normalizeGSTIN(gstin) {
  if (!gstin) return "";
  return gstin.toString().trim().toUpperCase().replace(/\s/g, "");
}

module.exports = { normalizeInvoiceNumber, normalizeGSTIN };

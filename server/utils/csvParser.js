/**
 * Tally Prime Purchase Register CSV Parser
 * Handles standard Tally export format with BOM, quoted fields, etc.
 */

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText) {
  // Strip BOM if present
  const text = csvText.replace(/^\uFEFF/, "").trim();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV must have at least a header row and one data row");

  const headers = parseCSVLine(lines[0]);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every((v) => !v)) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Map raw CSV row to normalized Tally invoice object
 */
function mapTallyRow(row) {
  return {
    date: row["Date"] || "",
    particulars: row["Particulars"] || "",
    gstin: row["GSTIN/UIN"] || "",
    voucherType: row["Voucher Type"] || "",
    voucherNo: row["Voucher No"] || "",
    supplierInvNo: row["Supplier Inv No"] || "",
    taxableValue: parseFloat(row["Taxable Value"]) || 0,
    igst: parseFloat(row["Integrated Tax"]) || 0,
    cgst: parseFloat(row["Central Tax"]) || 0,
    sgst: parseFloat(row["State/UT Tax"]) || 0,
    totalTax: parseFloat(row["Total Tax"]) || 0,
    invoiceValue: parseFloat(row["Invoice Value"]) || 0,
    purchaseLedger: row["Purchase Ledger"] || "",
    vendorMobile: row["Vendor Mobile"] || "",
  };
}

/**
 * Parse full Tally CSV text to array of invoice objects
 * @param {string} csvText
 * @returns {Array}
 */
function parseTallyCSV(csvText) {
  const rows = parseCSV(csvText);
  return rows.map(mapTallyRow);
}

module.exports = { parseTallyCSV };

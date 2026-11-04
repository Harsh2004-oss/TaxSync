/**
 * GSTR-2B JSON Parser
 * Handles official GST portal GSTR-2B JSON format — b2b section
 */

/**
 * Flatten GSTR-2B JSON into array of invoice objects with ctin (supplier GSTIN)
 * @param {Object} gstr2bJson - Parsed JSON from GST portal
 * @returns {Array} Flat array of invoices
 */
function parseGSTR2B(gstr2bJson) {
  const invoices = [];

  // Handle both direct object and string input
  let data = gstr2bJson;
  if (typeof gstr2bJson === "string") {
    try {
      data = JSON.parse(gstr2bJson);
    } catch (e) {
      throw new Error("Invalid GSTR-2B JSON format");
    }
  }

  // Handle nested structure: some portals wrap in { data: { ... } }
  if (data.data) data = data.data;

  const b2b = data.b2b || [];

  for (const supplier of b2b) {
    const ctin = supplier.ctin || "";
    const supplierInvs = supplier.inv || [];

    for (const inv of supplierInvs) {
      // Flatten items (tax details) — pick first item for MVP
      const items = inv.items || [{}];
      const item = items[0] || {};

      invoices.push({
        ctin,
        inum: inv.inum || "",
        dt: inv.dt || "",
        val: parseFloat(inv.val) || 0,
        itcavl: inv.itcavl || "N",
        pos: inv.pos || "",
        invTyp: inv.inv_typ || "R",
        txval: parseFloat(item.txval) || 0,
        iamt: parseFloat(item.iamt) || 0,
        camt: parseFloat(item.camt) || 0,
        samt: parseFloat(item.samt) || 0,
        csamt: parseFloat(item.csamt) || 0,
        totalTax: (parseFloat(item.iamt) || 0) + (parseFloat(item.camt) || 0) + (parseFloat(item.samt) || 0),
      });
    }
  }

  return invoices;
}

module.exports = { parseGSTR2B };

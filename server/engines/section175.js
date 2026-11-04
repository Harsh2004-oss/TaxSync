/**
 * Section 17(5) Blocked ITC Detection Engine
 * Flags invoices where Input Tax Credit cannot be claimed per CGST Act.
 */

const BLOCKED_RULES = [
  // Food & Beverages — 17(5)(b)(i)
  { keywords: ["FOOD", "BEVERAGE", "CATERING", "SWEETS", "SNACKS", "CANTEEN", "RESTAURANT", "REFRESHMENT", "LUNCH", "DINNER", "TEA", "COFFEE"], clause: "Section 17(5)(b)(i)", gstr3bTable: "4(B)(1)", description: "Food & Beverages" },

  // Club membership & fitness — 17(5)(b)(ii)
  { keywords: ["GYM", "FITNESS", "MEMBERSHIP", "CLUB", "SPORTS"], clause: "Section 17(5)(b)(ii)", gstr3bTable: "4(B)(1)", description: "Club Membership / Fitness" },

  // Life & health insurance — 17(5)(b)(iii)
  { keywords: ["HEALTH INSURANCE", "LIFE INSURANCE", "MEDICLAIM", "PERSONAL ACCIDENT"], clause: "Section 17(5)(b)(iii)", gstr3bTable: "4(B)(1)", description: "Health / Life Insurance" },

  // Travel benefits & employee welfare — 17(5)(b)
  { keywords: ["STAFF WELFARE", "EMPLOYEE WELFARE", "GIFT", "PERSONAL EXPENSES"], clause: "Section 17(5)(b)", gstr3bTable: "4(B)(1)", description: "Staff Welfare / Employee Benefits" },

  // Motor vehicles & conveyance — 17(5)(a)
  { keywords: ["MOTOR VEHICLE", "VEHICLE REPAIR", "CAR REPAIR", "CAR MAINTENANCE", "AUTOMOBILE", "CAB SERVICE", "TAXI", "VEHICLE MAINT", "REPAIR - CAR", "REPAIR-CAR", "AUTO REPAIR"], clause: "Section 17(5)(a)", gstr3bTable: "4(B)(1)", description: "Motor Vehicle / Conveyance" },

  // Works contract on immovable property — 17(5)(c)
  { keywords: ["CIVIL WORK", "CONSTRUCTION", "BUILDING REPAIR", "RENOVATION", "WORKS CONTRACT"], clause: "Section 17(5)(c)", gstr3bTable: "4(B)(2)", description: "Works Contract (Immovable Property)" },
];

/**
 * Check if purchase ledger keyword triggers Section 17(5) block
 * @param {string} purchaseLedger
 * @returns {{ isBlocked: boolean, clause?: string, gstr3bTable?: string, reason?: string, description?: string }}
 */
function checkSection175Ineligibility(purchaseLedger) {
  if (!purchaseLedger) return { isBlocked: false };
  const upper = purchaseLedger.toString().toUpperCase();

  for (const rule of BLOCKED_RULES) {
    for (const keyword of rule.keywords) {
      if (upper.includes(keyword)) {
        return {
          isBlocked: true,
          clause: rule.clause,
          gstr3bTable: rule.gstr3bTable,
          description: rule.description,
          matchedKeyword: keyword,
          reason: `Matched restricted ledger keyword: '${keyword}'. Do NOT claim in GSTR-3B Table 4(A). Move to Table ${rule.gstr3bTable} — Ineligible ITC.`,
        };
      }
    }
  }

  return { isBlocked: false };
}

module.exports = { checkSection175Ineligibility, BLOCKED_RULES };

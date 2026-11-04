/**
 * Levenshtein Fuzzy Similarity Matcher
 * Returns similarity score between 0 (no match) and 1 (perfect match).
 */
function levenshteinSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  s1 = s1.toString();
  s2 = s2.toString();

  let longer = s1.length >= s2.length ? s1 : s2;
  let shorter = s1.length < s2.length ? s1 : s2;
  let longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  let costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / parseFloat(longerLength);
}

/**
 * Check if two invoice numbers match (exact or fuzzy)
 * Returns: { matched: bool, type: 'exact'|'fuzzy'|'none', score: float }
 */
function matchInvoiceNumbers(inv1, inv2, threshold = 0.75) {
  if (!inv1 || !inv2) return { matched: false, type: "none", score: 0 };

  // Exact match
  if (inv1 === inv2) return { matched: true, type: "exact", score: 1.0 };

  // Fuzzy match
  const score = levenshteinSimilarity(inv1, inv2);
  if (score >= threshold) {
    return { matched: true, type: "fuzzy", score };
  }

  return { matched: false, type: "none", score };
}

module.exports = { levenshteinSimilarity, matchInvoiceNumbers };

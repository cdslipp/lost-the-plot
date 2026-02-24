/**
 * A robust search filter that prioritizes exact matches, prefix matches, and word-start matches.
 * Returns a score between 0 and 1, where 1 is a perfect match and 0 is no match.
 *
 * This implementation is designed to be stricter than a pure subsequence match to avoid
 * irrelevant results (e.g., "drum" matching "woodwind instrument").
 */
export function commandScore(value: string, search: string): number {
	const s = search.toLowerCase().trim();
	if (!s) return 1;

	const t = value.toLowerCase();

	// 1. Exact match
	if (t === s) return 1;

	// 2. Starts with search string
	if (t.startsWith(s)) return 0.95;

	// 3. Substring match at word start
	// Check if it matches at the beginning of any word in the target
	const words = t.split(/[\s\-_]+/);
	for (let i = 0; i < words.length; i++) {
		if (words[i].startsWith(s)) {
			// Higher score for earlier words
			return 0.9 - (i / words.length) * 0.1;
		}
	}

	// 4. Any substring match
	const anyIndex = t.indexOf(s);
	if (anyIndex !== -1) {
		return 0.7 - (anyIndex / t.length) * 0.1;
	}

	// 5. Multi-word match (all search words must be present as substrings)
	const searchWords = s.split(/\s+/).filter(Boolean);
	if (searchWords.length > 1) {
		if (searchWords.every((word) => t.includes(word))) {
			return 0.6;
		}
	}

	return 0;
}

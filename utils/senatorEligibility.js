/**
 * Maps senator category titles to valid-voter roster keys (department field on ValidVoter).
 * Roster uses abbreviations: IT, CS, SE plus class year (e.g. "IT 200").
 *
 * Rule: for senator positions at level 300 or 400, only students registered in the
 * roster "{abbrev} {level - 100}" may vote (e.g. IT Senator 300 → IT 200).
 */

function normalizeTitle(title) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} categoryTitle
 * @returns {string | null} Roster department label to match ValidVoter.department, or null if rule does not apply
 */
function resolveSenatorEligibleRosterDepartment(categoryTitle) {
  const title = normalizeTitle(categoryTitle);
  if (!title) return null;

  const t = title.toLowerCase();
  if (!t.includes('senator')) return null;

  const levelMatch = title.match(/\b(300|400)\b/);
  if (!levelMatch) return null;

  const positionLevel = parseInt(levelMatch[1], 10);
  if (positionLevel !== 300 && positionLevel !== 400) return null;

  /** @type {'IT' | 'CS' | 'SE' | null} */
  let abbrev = null;
  if (/software\s+engineering/i.test(title)) {
    abbrev = 'SE';
  } else if (/computer\s+science/i.test(title)) {
    abbrev = 'CS';
  } else if (/information\s+technology/i.test(title)) {
    abbrev = 'IT';
  } else if (/(?:^|[^a-z])it(?:[^a-z]|$)/i.test(title)) {
    abbrev = 'IT';
  }

  if (!abbrev) return null;

  const rosterLevel = positionLevel - 100;
  return `${abbrev} ${rosterLevel}`;
}

module.exports = {
  resolveSenatorEligibleRosterDepartment,
};

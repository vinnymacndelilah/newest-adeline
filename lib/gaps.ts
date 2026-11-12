import {
  CreditCategory,
  GraduationGapItem,
  GraduationMap,
  GraduationMilestone,
  RegistrarEntry,
  StudentProfile,
  TrackName,
} from './types';
import { GRADUATION_REQUIREMENTS } from './initial-data';

const CATEGORY_TO_TRACK: Record<CreditCategory, TrackName> = {
  'Humanities & History': 'Truth-Based History',
  'Laboratory Science': "God's Creation & Science",
  Mathematics: 'Mathematics & Logic',
  'Literature & Rhetoric': 'Literature & Rhetoric',
  'Civics & Economics': 'Justice & Change-making',
  'Practical Arts & Economy': 'Creative Economy & Practical Arts',
  'Worldview & Stewardship': 'Discipleship & Stewardship',
};

function buildBridgeSuggestion(student: StudentProfile, category: CreditCategory): string {
  const interest = student.interests[0] || 'everyday curiosity';
  switch (category) {
    case 'Mathematics':
      return `Applied ratios, geometry, and cost modeling inside ${interest}`;
    case 'Laboratory Science':
      return `Controlled Sovereign Lab investigation connected to ${interest}`;
    case 'Humanities & History':
      return `Primary-source letters and historical context behind ${interest}`;
    case 'Literature & Rhetoric':
      return `Close reading & persuasive writing inspired by ${interest}`;
    case 'Civics & Economics':
      return `Systems, property, markets, and community incentives around ${interest}`;
    case 'Practical Arts & Economy':
      return `Build, price, and document a real-world project from ${interest}`;
    case 'Worldview & Stewardship':
      return `Biblical stewardship, wisdom, and character reflection on ${interest}`;
  }
}

export function computeGraduationGaps(
  student: StudentProfile,
  entries: RegistrarEntry[]
): GraduationGapItem[] {
  const studentEntries = entries.filter((e) => e.studentId === student.id);
  // High school 4-year progress factor (ages 14-18 = 9th-12th); younger learners scale gently
  const paceFactor =
    student.age >= 16
      ? 0.65
      : student.age >= 14
      ? 0.3
      : student.age >= 12
      ? 0.15
      : 0.08;

  return GRADUATION_REQUIREMENTS.map((req) => {
    const earned = studentEntries
      .filter((e) => e.creditCategory === req.category)
      .reduce((sum, e) => sum + e.creditsEarned, 0);
    const expectedByAge = Number((req.requiredCredits * paceFactor).toFixed(2));
    const deficit = Math.max(0, Number((expectedByAge - earned).toFixed(2)));
    const pct = Math.min(100, Math.round((earned / req.requiredCredits) * 100));

    return {
      category: req.category,
      earned,
      required: req.requiredCredits,
      expectedByAge,
      deficit,
      pct,
      suggestedBridgeTopic: buildBridgeSuggestion(student, req.category),
    };
  }).sort((a, b) => b.deficit - a.deficit || a.pct - b.pct);
}

export function trackForCategory(category: CreditCategory): TrackName {
  return CATEGORY_TO_TRACK[category];
}

export function applyLearningToGraduationMap(
  map: GraduationMap | undefined,
  entry: RegistrarEntry,
  targetMilestoneId?: string | null
): GraduationMap | undefined {
  if (!map || map.studentId !== entry.studentId) return map;

  let filledOne = false;
  const phaseWeight: Record<GraduationMilestone['phase'], number> = {
    Foundations: 0,
    'Core Mastery': 1,
    'Capstone & Launch': 2,
  };

  // First try exact targeted milestone if launched from the Graduation Map
  let chosenId = targetMilestoneId ?? null;

  if (!chosenId) {
    // Otherwise pick the earliest non-mastered milestone in the same CreditCategory
    const candidates = map.milestones
      .filter((m) => m.creditCategory === entry.creditCategory && m.status !== 'mastered')
      .sort((a, b) => phaseWeight[a.phase] - phaseWeight[b.phase]);
    chosenId = candidates[0]?.id ?? null;
  }

  const nextMilestones = map.milestones.map((m) => {
    if (m.id === chosenId && !filledOne) {
      filledOne = true;
      const shouldMaster =
        Boolean(targetMilestoneId) ||
        entry.masteryLevel === 'Mastery' ||
        entry.masteryLevel === 'Demonstrated' ||
        m.status === 'in-progress';
      return {
        ...m,
        status: shouldMaster ? ('mastered' as const) : ('in-progress' as const),
        completedDate: shouldMaster ? entry.date : m.completedDate,
        linkedEntryTitle: entry.title,
      };
    }
    return m;
  });

  if (!filledOne) return map;

  // Slightly boost matching domain readiness score when a milestone fills in
  const nextRatings = map.domainRatings.map((r) => {
    if (r.category !== entry.creditCategory) return r;
    const boostedScore = Math.min(100, r.scorePct + 8);
    return {
      ...r,
      scorePct: boostedScore,
      assessedLevel:
        boostedScore >= 85
          ? ('Accelerated' as const)
          : boostedScore >= 65
          ? ('On Pace' as const)
          : boostedScore >= 40
          ? ('Developing' as const)
          : ('Foundational' as const),
    };
  });

  return {
    ...map,
    milestones: nextMilestones,
    domainRatings: nextRatings,
  };
}


import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  ADELINE_MODEL,
  DEAR_ADELINE_SYSTEM_PROMPT,
  getGeminiClient,
} from '@/lib/gemini';
import {
  AssessmentAnswerSubmission,
  AssessmentQuestion,
  AssessmentScope,
  CreditCategory,
  DomainReadinessRating,
  GraduationGapItem,
  GraduationMap,
  GraduationMilestone,
  RegistrarEntry,
  StudentMemory,
  StudentProfile,
  TrackName,
} from '@/lib/types';

const VALID_CATEGORIES: CreditCategory[] = [
  'Humanities & History',
  'Laboratory Science',
  'Mathematics',
  'Literature & Rhetoric',
  'Civics & Economics',
  'Practical Arts & Economy',
  'Worldview & Stewardship',
];

const CATEGORY_TO_TRACK: Record<CreditCategory, TrackName> = {
  'Humanities & History': 'Truth-Based History',
  'Laboratory Science': "God's Creation & Science",
  Mathematics: 'Mathematics & Logic',
  'Literature & Rhetoric': 'Literature & Rhetoric',
  'Civics & Economics': 'Justice & Change-making',
  'Practical Arts & Economy': 'Creative Economy & Practical Arts',
  'Worldview & Stewardship': 'Discipleship & Stewardship',
};

function normalizeCategory(raw: unknown): CreditCategory {
  if (typeof raw === 'string') {
    const exact = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === raw.trim().toLowerCase()
    );
    if (exact) return exact;
  }
  return 'Mathematics';
}

function normalizePhase(
  raw: unknown
): 'Foundations' | 'Core Mastery' | 'Capstone & Launch' {
  if (raw === 'Foundations' || raw === 'Core Mastery' || raw === 'Capstone & Launch') {
    return raw;
  }
  return 'Core Mastery';
}

function normalizeStatus(raw: unknown): 'mastered' | 'in-progress' | 'upcoming' {
  if (raw === 'mastered' || raw === 'in-progress' || raw === 'upcoming') {
    return raw;
  }
  return 'upcoming';
}

function normalizeLevel(
  raw: unknown
): 'Foundational' | 'Developing' | 'On Pace' | 'Accelerated' {
  if (
    raw === 'Foundational' ||
    raw === 'Developing' ||
    raw === 'On Pace' ||
    raw === 'Accelerated'
  ) {
    return raw;
  }
  return 'Developing';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student,
      memory,
      registrarEntries = [],
      graduationGaps = [],
      scope = 'All Domains',
      questions = [],
      submissions = [],
    }: {
      student: StudentProfile;
      memory?: StudentMemory;
      registrarEntries?: RegistrarEntry[];
      graduationGaps?: GraduationGapItem[];
      scope?: AssessmentScope;
      questions: AssessmentQuestion[];
      submissions: AssessmentAnswerSubmission[];
    } = body;

    const ai = getGeminiClient();

    const studentEntries = registrarEntries.filter((e) => e.studentId === student.id);

    const reviewLines = questions.map((q, idx) => {
      const sub = submissions.find((s) => s.questionId === q.id);
      const selectedIdx = sub?.selectedIndex ?? -1;
      const isCorrect = selectedIdx === q.correctIndex;
      return `Q${idx + 1} [${q.creditCategory} — ${q.capabilityTested}]:
- Prompt: ${q.prompt}
- Student Selected: ${selectedIdx >= 0 ? q.options[selectedIdx] : 'No selection'} (${isCorrect ? 'CORRECT' : `INCORRECT; Expected: ${q.options[q.correctIndex]}`})
- Student Written Reasoning: "${sub?.reasoningNote?.trim() || 'None provided'}"`;
    });

    const prompt = `Evaluate this student's Knowledge Assessment and build a Personalized Graduation Map that can fill in over time as they learn with Adeline.

Learner:
- Name: ${student.name}, Age ${student.age} (${student.gradeLabel})
- Target Graduation Year: ${student.targetGraduationYear}
- Interests: ${student.interests.join(', ') || 'Broad baseline across core domains'}
- Pace: ${student.pace}

Assessment Scope: ${scope}
Assessment Performance:
${reviewLines.join('\n\n')}

Existing Registrar Credits Earned by ${student.name}:
${studentEntries.map((e) => `- ${e.creditCategory}: ${e.title} (+${e.creditsEarned} cr, ${e.masteryLevel}, ${e.date})`).join('\n') || '- None logged yet'}

Graduation Credit Gap Breakdown:
${graduationGaps.map((g) => `- ${g.category}: ${g.earned.toFixed(2)}/${g.required.toFixed(1)} cr (expected by age: ${g.expectedByAge})`).join('\n')}

Existing Long-Term Memory:
${(memory?.longTerm?.learnedAboutStudent ?? []).join(' | ') || 'None'}

Instructions:
1. Synthesize an honest, encouraging "overallReadinessSummary" tailored to ${student.name} (Age ${student.age}) and their path to ${student.targetGraduationYear} graduation.
2. Provide 3 "strengthsObserved" and 3 "priorityGaps" combining assessment answers, reasoning quality, and registrar credits.
3. Provide "domainRatings" covering ALL 7 Credit Categories (${VALID_CATEGORIES.join(', ')}):
   - Use 'Foundational' | 'Developing' | 'On Pace' | 'Accelerated', scorePct (0-100), and a concise 1-sentence summaryNote.
4. Build a rich 9-milestone Personalized Graduation Map ("milestones") spanning the 3 phases ('Foundations', 'Core Mastery', 'Capstone & Launch'):
   - Cover all 7 graduation domains across the roadmap, prioritizing ${student.name}'s gaps and building around their interests (${student.interests.join(', ')}).
   - If the student ALREADY demonstrated mastery in a domain via their existing Registrar entries OR answered accurately with strong reasoning on a foundational skill, mark 2-3 early/proven milestones as status: "mastered" (and set linkedEntryTitle to the matching Registrar title if applicable!) so their existing work visibly fills in the map right away!
   - Mark 2 immediate next-step milestones as status: "in-progress", and the rest as "upcoming".
   - Every milestone must include a specific "classroomTopic" so ${student.name} can click 1 button to launch an OpenMAIC Classroom lesson on that exact milestone.
5. Also return "memoryUpdates" (1 newLongTermInsight, 1 masteredConcept if demonstrated else "", 1 identifiedGap) to update Adeline's Long-Term Memory.`;

    const response = await ai.models.generateContent({
      model: ADELINE_MODEL,
      contents: prompt,
      config: {
        systemInstruction: DEAR_ADELINE_SYSTEM_PROMPT,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallReadinessSummary: { type: Type.STRING },
            strengthsObserved: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            priorityGaps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            domainRatings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  assessedLevel: { type: Type.STRING },
                  scorePct: { type: Type.INTEGER },
                  summaryNote: { type: Type.STRING },
                },
                required: ['category', 'assessedLevel', 'scorePct', 'summaryNote'],
              },
            },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phase: { type: Type.STRING },
                  creditCategory: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  evidenceGoal: { type: Type.STRING },
                  classroomTopic: { type: Type.STRING },
                  creditValue: { type: Type.NUMBER },
                  status: { type: Type.STRING },
                  linkedEntryTitle: { type: Type.STRING },
                },
                required: [
                  'phase',
                  'creditCategory',
                  'title',
                  'description',
                  'evidenceGoal',
                  'classroomTopic',
                  'creditValue',
                  'status',
                ],
              },
            },
            memoryUpdates: {
              type: Type.OBJECT,
              properties: {
                newLongTermInsight: { type: Type.STRING },
                masteredConcept: { type: Type.STRING },
                identifiedGap: { type: Type.STRING },
              },
              required: ['newLongTermInsight', 'masteredConcept', 'identifiedGap'],
            },
          },
          required: [
            'overallReadinessSummary',
            'strengthsObserved',
            'priorityGaps',
            'domainRatings',
            'milestones',
            'memoryUpdates',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      overallReadinessSummary?: string;
      strengthsObserved?: string[];
      priorityGaps?: string[];
      domainRatings?: Array<Record<string, unknown>>;
      milestones?: Array<Record<string, unknown>>;
      memoryUpdates?: {
        newLongTermInsight?: string;
        masteredConcept?: string;
        identifiedGap?: string;
      };
    };

    const today = new Date().toISOString().split('T')[0];

    const normalizedRatings: DomainReadinessRating[] = VALID_CATEGORIES.map((cat) => {
      const found = (parsed.domainRatings ?? []).find(
        (r) => normalizeCategory(r.category) === cat
      );
      return {
        category: cat,
        assessedLevel: normalizeLevel(found?.assessedLevel),
        scorePct: Math.max(
          0,
          Math.min(100, Number(found?.scorePct ?? 50) || 50)
        ),
        summaryNote: String(
          found?.summaryNote || `Diagnostic benchmark recorded for ${cat}.`
        ),
      };
    });

    const normalizedMilestones: GraduationMilestone[] = (parsed.milestones ?? []).map(
      (m, idx) => {
        const cat = normalizeCategory(m.creditCategory);
        const status = normalizeStatus(m.status);
        return {
          id: `milestone-${Date.now()}-${idx}`,
          phase: normalizePhase(m.phase),
          creditCategory: cat,
          track: CATEGORY_TO_TRACK[cat],
          title: String(m.title || `${cat} Milestone`),
          description: String(m.description || ''),
          evidenceGoal: String(m.evidenceGoal || 'Demonstrated mastery with Adeline'),
          classroomTopic: String(m.classroomTopic || m.title || cat),
          creditValue: Math.max(0.1, Number(m.creditValue) || 0.25),
          status,
          completedDate: status === 'mastered' ? today : undefined,
          linkedEntryTitle:
            status === 'mastered' && m.linkedEntryTitle
              ? String(m.linkedEntryTitle)
              : status === 'mastered'
              ? 'Demonstrated in Knowledge Assessment'
              : undefined,
        };
      }
    );

    const graduationMap: GraduationMap = {
      studentId: student.id,
      generatedAt: today,
      lastAssessedScope: scope,
      overallReadinessSummary: String(
        parsed.overallReadinessSummary ||
          `${student.name}'s personalized graduation map is ready.`
      ),
      strengthsObserved: (parsed.strengthsObserved ?? []).map(String).slice(0, 4),
      priorityGaps: (parsed.priorityGaps ?? []).map(String).slice(0, 4),
      domainRatings: normalizedRatings,
      milestones: normalizedMilestones,
    };

    return NextResponse.json({
      graduationMap,
      memoryUpdates: parsed.memoryUpdates ?? null,
    });
  } catch (error) {
    console.error('Assessment Evaluate Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to evaluate assessment right now.',
      },
      { status: 500 }
    );
  }
}

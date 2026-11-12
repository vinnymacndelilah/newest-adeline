import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  ADELINE_MODEL,
  DEAR_ADELINE_SYSTEM_PROMPT,
  getGeminiClient,
} from '@/lib/gemini';
import {
  AssessmentQuestion,
  AssessmentScope,
  CreditCategory,
  GraduationGapItem,
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

function normalizeCategory(raw: unknown, fallback: CreditCategory): CreditCategory {
  if (typeof raw === 'string') {
    const exact = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === raw.trim().toLowerCase()
    );
    if (exact) return exact;
  }
  return fallback;
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
    }: {
      student: StudentProfile;
      memory?: StudentMemory;
      registrarEntries?: RegistrarEntry[];
      graduationGaps?: GraduationGapItem[];
      scope?: AssessmentScope;
    } = body;

    const ai = getGeminiClient();

    const studentEntries = registrarEntries
      .filter((e) => e.studentId === student.id)
      .slice(0, 8);

    const scopePrompt =
      scope === 'All Domains'
        ? `Generate exactly 7 diagnostic reasoning questions—1 for each of the 7 graduation credit categories: ${VALID_CATEGORIES.join(', ')}.`
        : `Generate exactly 4 progressive diagnostic reasoning questions focused on "${scope}", moving from foundational grasp to real-world application.`;

    const prompt = `Create an authentic, non-busywork Knowledge & Capability Assessment for this homeschool learner so we can map their personalized path toward graduation.

Learner Profile:
- Name: ${student.name}
- Age: ${student.age}
- Grade & Tier: ${student.gradeLabel}
- Target Graduation Year: ${student.targetGraduationYear}
- Interests: ${student.interests.join(', ') || 'Broad age-appropriate baseline across all 7 domains'}
- Current Focus: ${student.currentFocus}

Adeline Memory Notes:
- Learned About Student: ${(memory?.longTerm?.learnedAboutStudent ?? []).join(' | ') || 'None yet'}
- Mastered Concepts: ${(memory?.longTerm?.masteredConcepts ?? []).join(' | ') || 'None yet'}
- Identified Gaps: ${(memory?.longTerm?.identifiedGaps ?? []).join(' | ') || 'None yet'}

Recent Registrar Credits (${studentEntries.length} shown):
${studentEntries.map((e) => `- ${e.creditCategory}: ${e.title} (${e.masteryLevel})`).join('\n') || '- No entries yet'}

Current Priority Graduation Gaps:
${graduationGaps.slice(0, 3).map((g) => `- ${g.category}: ${g.earned}/${g.required} cr (expected by age ~${g.expectedByAge})`).join('\n')}

Assessment Scope:
${scopePrompt}

Design Rules:
1. NEVER write rote trivia or busywork worksheets. Every question must test genuine reasoning, primary-evidence judgment, scientific control thinking, real-world mathematics, literary analysis, economic/civic cause-and-effect, or Scripture-in-context discernment calibrated specifically to a ${student.age}-year-old (${student.gradeLabel}).
2. Connect scenarios naturally to ${student.name}'s interests where fitting (${student.interests.join(', ')}).
3. Include 4 plausible, thoughtful answer choices per question (never silly throwaway distractors) with exact zero-based correctIndex (0..3).
4. Set creditCategory to exact valid domain strings: ${VALID_CATEGORIES.join(', ')}.`;

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
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  creditCategory: { type: Type.STRING },
                  capabilityTested: {
                    type: Type.STRING,
                    description: 'Concise name of the real-world capability or reasoning skill checked.',
                  },
                  scenarioContext: {
                    type: Type.STRING,
                    description: 'Short realistic scenario, dataset, primary excerpt, or problem setup.',
                  },
                  prompt: {
                    type: Type.STRING,
                    description: 'The clear question asking the student to reason from the scenario.',
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Exactly 4 thoughtful options.',
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: {
                    type: Type.STRING,
                    description: 'Clear explanation of why the correct reasoning holds.',
                  },
                },
                required: [
                  'creditCategory',
                  'capabilityTested',
                  'scenarioContext',
                  'prompt',
                  'options',
                  'correctIndex',
                  'explanation',
                ],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const raw = JSON.parse((response.text ?? '{}').trim()) as {
      questions?: Array<Record<string, unknown>>;
    };

    const fallbackCategory: CreditCategory =
      scope === 'All Domains' ? 'Mathematics' : scope;

    const questions: AssessmentQuestion[] = (raw.questions ?? []).map((q, idx) => {
      const cat = normalizeCategory(
        q.creditCategory,
        scope === 'All Domains'
          ? VALID_CATEGORIES[idx % VALID_CATEGORIES.length]
          : fallbackCategory
      );
      const opts = Array.isArray(q.options)
        ? q.options.map((o) => String(o)).slice(0, 4)
        : ['Option A', 'Option B', 'Option C', 'Option D'];
      while (opts.length < 4) opts.push(`Option ${opts.length + 1}`);

      const rawIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
      const safeIdx = Math.max(0, Math.min(3, rawIdx));

      return {
        id: `assess-q-${Date.now()}-${idx}`,
        creditCategory: cat,
        track: CATEGORY_TO_TRACK[cat],
        capabilityTested: String(q.capabilityTested || `${cat} Reasoning`),
        scenarioContext: String(q.scenarioContext || ''),
        prompt: String(q.prompt || ''),
        options: opts,
        correctIndex: safeIdx,
        explanation: String(q.explanation || ''),
      };
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Assessment Generate Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to generate knowledge assessment right now.',
      },
      { status: 500 }
    );
  }
}

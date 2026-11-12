import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  ADELINE_MODEL,
  DEAR_ADELINE_SYSTEM_PROMPT,
  TRACK_THRESHOLDS,
  getGeminiClient,
} from '@/lib/gemini';
import { StudentProfile, TrackName } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic,
      track,
      experienceMode = 'investigation',
      student,
      memory,
      graduationGaps = [],
      sourceContext,
    }: {
      topic: string;
      track?: TrackName;
      experienceMode?: string;
      student: StudentProfile;
      memory?: {
        longTerm?: {
          learnedAboutStudent?: string[];
          masteredConcepts?: string[];
          identifiedGaps?: string[];
        };
      };
      graduationGaps?: { category: string; deficit: number; earned: number; required: number }[];
      sourceContext?: string;
    } = body;

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Please specify a topic or question to open in the Classroom.' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const gapSummary = graduationGaps
      .slice(0, 3)
      .map((g) => `${g.category} (${g.earned.toFixed(2)}/${g.required.toFixed(1)} cr)`)
      .join(', ');

    const prompt = `Build a complete OpenMAIC-inspired, multi-scene Dear Adeline Classroom Experience for:
- Topic / Curiosity: "${topic}"
- Preferred Track (if specified): ${track ?? 'Select the best matching canonical track'}
- Preferred Experience Mode: ${experienceMode}
- Active Learner: ${student?.name ?? 'Student'}, Age ${student?.age ?? 12} (${student?.gradeLabel ?? 'Scout'}), Tier: ${student?.tier ?? 'Scout'}, Interests: ${(student?.interests ?? []).join(', ') || 'Still discovering interests'}
- Long-Term Memory About ${student?.name ?? 'Student'}: ${(memory?.longTerm?.learnedAboutStudent ?? []).join(' | ') || 'None yet'}
- Already Mastered (do not repeat basic coverage): ${(memory?.longTerm?.masteredConcepts ?? []).join(' | ') || 'None yet'}
- Graduation Gaps to Bridge Gently: ${gapSummary || 'Balanced across tracks'}
${sourceContext ? `- Source / Book Context: ${sourceContext}` : ''}

Canonical Track Thresholds for Witness Protocol:
- Truth-Based History: 0.82
- Justice & Change-making: 0.82
- God's Creation & Science: 0.72
- Mathematics & Logic, Literature & Rhetoric, Creative Economy & Practical Arts, Discipleship & Stewardship: not gated (set governed=false, threshold=null).

OpenMAIC Classroom Scene Architecture:
1. Design 4 rich interactive Scenes (Invitation, Discovery, Action, Demonstration), each with:
   - slidePoints: 3 crisp slide anchor bullets
   - content: clear spoken/narrative teaching from Adeline
   - whiteboardSteps: 3 step-by-step derivations, causal chains, primary quote breakdowns, or diagrams for the interactive whiteboard
   - peerPerspectives: 2 roundtable classmate comments (one "Curious Peer" voicing a realistic misconception, one "Evidence Checker" asking for proof or primary source context)
   - keyTakeaway & socraticPrompt
2. Design 1 interactiveSimulation parameter sandbox tailored to the lesson (e.g., fermentation temperature, electromagnet turns, compound interest rate, historical timeline pressure, or structural load):
   - Provide numeric min, max, step, defaultValue, multiplier, baselineOffset, optimalMin, optimalMax, and 3 clear regime notes (lowRangeNote, optimalRangeNote, highRangeNote) so manipulating the slider teaches real cause-and-effect!
3. Provide authentic family differentiation across Sprout (ages 6-8), Scout (ages 9-12), and Sovereign (ages 13-18).
4. Create a Reinforcing Activity with 3 interactiveChecks + 1 real-world handsOnMission.
5. Recommend realistic Carnegie credit hours and subjectCategory for the Registrar.`;

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
            title: { type: Type.STRING },
            track: { type: Type.STRING },
            experienceMode: { type: Type.STRING },
            drivingQuestion: { type: Type.STRING },
            whyItMatters: { type: Type.STRING },
            creationConnection: { type: Type.STRING },
            witnessProtocol: {
              type: Type.OBJECT,
              properties: {
                governed: { type: Type.BOOLEAN },
                achievedConfidence: { type: Type.NUMBER },
                primaryEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                competingInterpretations: { type: Type.ARRAY, items: { type: Type.STRING } },
                adelineSynthesis: { type: Type.STRING },
                researchMissionNote: { type: Type.STRING },
              },
              required: [
                'governed',
                'achievedConfidence',
                'primaryEvidence',
                'competingInterpretations',
                'adelineSynthesis',
              ],
            },
            stages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  phase: { type: Type.STRING },
                  title: { type: Type.STRING },
                  slidePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  content: { type: Type.STRING },
                  whiteboardSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  peerPerspectives: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        speaker: { type: Type.STRING },
                        role: { type: Type.STRING },
                        comment: { type: Type.STRING },
                      },
                      required: ['speaker', 'role', 'comment'],
                    },
                  },
                  keyTakeaway: { type: Type.STRING },
                  socraticPrompt: { type: Type.STRING },
                },
                required: [
                  'id',
                  'phase',
                  'title',
                  'slidePoints',
                  'content',
                  'whiteboardSteps',
                  'peerPerspectives',
                  'keyTakeaway',
                  'socraticPrompt',
                ],
              },
            },
            interactiveSimulation: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                variableLabel: { type: Type.STRING },
                unit: { type: Type.STRING },
                min: { type: Type.NUMBER },
                max: { type: Type.NUMBER },
                step: { type: Type.NUMBER },
                defaultValue: { type: Type.NUMBER },
                outputLabel: { type: Type.STRING },
                outputUnit: { type: Type.STRING },
                multiplier: { type: Type.NUMBER },
                baselineOffset: { type: Type.NUMBER },
                lowRangeNote: { type: Type.STRING },
                optimalRangeNote: { type: Type.STRING },
                highRangeNote: { type: Type.STRING },
                optimalMin: { type: Type.NUMBER },
                optimalMax: { type: Type.NUMBER },
              },
              required: [
                'title',
                'variableLabel',
                'unit',
                'min',
                'max',
                'step',
                'defaultValue',
                'outputLabel',
                'outputUnit',
                'multiplier',
                'baselineOffset',
                'lowRangeNote',
                'optimalRangeNote',
                'highRangeNote',
                'optimalMin',
                'optimalMax',
              ],
            },
            familyTiers: {
              type: Type.OBJECT,
              properties: {
                sprout: {
                  type: Type.OBJECT,
                  properties: {
                    tier: { type: Type.STRING },
                    ageRange: { type: Type.STRING },
                    focusVerb: { type: Type.STRING },
                    taskDescription: { type: Type.STRING },
                    deliverable: { type: Type.STRING },
                  },
                  required: ['tier', 'ageRange', 'focusVerb', 'taskDescription', 'deliverable'],
                },
                scout: {
                  type: Type.OBJECT,
                  properties: {
                    tier: { type: Type.STRING },
                    ageRange: { type: Type.STRING },
                    focusVerb: { type: Type.STRING },
                    taskDescription: { type: Type.STRING },
                    deliverable: { type: Type.STRING },
                  },
                  required: ['tier', 'ageRange', 'focusVerb', 'taskDescription', 'deliverable'],
                },
                sovereign: {
                  type: Type.OBJECT,
                  properties: {
                    tier: { type: Type.STRING },
                    ageRange: { type: Type.STRING },
                    focusVerb: { type: Type.STRING },
                    taskDescription: { type: Type.STRING },
                    deliverable: { type: Type.STRING },
                  },
                  required: ['tier', 'ageRange', 'focusVerb', 'taskDescription', 'deliverable'],
                },
              },
              required: ['sprout', 'scout', 'sovereign'],
            },
            reinforcingActivity: {
              type: Type.OBJECT,
              properties: {
                interactiveChecks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING },
                      question: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                      misconceptionNote: { type: Type.STRING },
                    },
                    required: [
                      'id',
                      'type',
                      'question',
                      'options',
                      'correctIndex',
                      'explanation',
                      'misconceptionNote',
                    ],
                  },
                },
                handsOnMission: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    capabilityDeveloped: { type: Type.STRING },
                    materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    documentationPrompt: { type: Type.STRING },
                    realWorldOutput: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'capabilityDeveloped',
                    'materials',
                    'steps',
                    'documentationPrompt',
                    'realWorldOutput',
                  ],
                },
              },
              required: ['interactiveChecks', 'handsOnMission'],
            },
            creditRecommendation: {
              type: Type.OBJECT,
              properties: {
                subjectCategory: { type: Type.STRING },
                estimatedHours: { type: Type.NUMBER },
                suggestedCredits: { type: Type.NUMBER },
              },
              required: ['subjectCategory', 'estimatedHours', 'suggestedCredits'],
            },
          },
          required: [
            'title',
            'track',
            'experienceMode',
            'drivingQuestion',
            'whyItMatters',
            'creationConnection',
            'witnessProtocol',
            'stages',
            'interactiveSimulation',
            'familyTiers',
            'reinforcingActivity',
            'creditRecommendation',
          ],
        },
      },
    });

    const generated = JSON.parse((response.text ?? '{}').trim());
    const resolvedTrack = generated.track as TrackName;
    const threshold = TRACK_THRESHOLDS[resolvedTrack] ?? null;

    const lesson = {
      id: `lesson-${Date.now()}`,
      studentId: student?.id ?? 'student-ellie',
      createdAt: new Date().toISOString(),
      topic,
      ...generated,
      witnessProtocol: {
        ...generated.witnessProtocol,
        governed: threshold !== null,
        threshold,
      },
      status: 'in-progress',
    };

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('Classroom Generation Error:', error);
    const errMessage =
      error instanceof Error ? error.message : 'Unable to generate classroom lesson.';
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  ADELINE_MODEL,
  DEAR_ADELINE_SYSTEM_PROMPT,
  getGeminiClient,
} from '@/lib/gemini';
import {
  ChatMessage,
  GraduationGapItem,
  StudentMemory,
  StudentProfile,
} from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      history = [],
      student,
      memory,
      graduationGaps = [],
      familyMode = false,
      contextHint,
    }: {
      message: string;
      history: Pick<ChatMessage, 'role' | 'content'>[];
      student: StudentProfile;
      memory?: StudentMemory;
      graduationGaps?: GraduationGapItem[];
      familyMode?: boolean;
      contextHint?: string;
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Please share a question or curiosity with Adeline.' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const conversationTranscript = history
      .slice(-10)
      .map((m) => `${m.role === 'user' ? 'Learner' : 'Adeline'}: ${m.content}`)
      .join('\n\n');

    const topGaps = graduationGaps
      .slice(0, 3)
      .map(
        (g) =>
          `- ${g.category}: ${g.earned.toFixed(2)}/${g.required.toFixed(1)} credits (deficit ${g.deficit.toFixed(2)} for age ${student?.age}; bridge idea: ${g.suggestedBridgeTopic})`
      )
      .join('\n');

    const prompt = `Active Learner Profile:
- Name: ${student?.name ?? 'Student'}
- Age / Grade: ${student?.age ?? 12} (${student?.gradeLabel ?? 'Scout'})
- Target Graduation Year: ${student?.targetGraduationYear ?? 2030}
- Learning Tier: ${student?.tier ?? 'Scout'}
- Interests: ${(student?.interests ?? []).join(', ') || 'Still discovering interests through conversation'}
- Current Focus: ${student?.currentFocus ?? 'General inquiry'}
- Pace: ${student?.pace ?? 'Steady'}
- Shared Family Investigation Mode: ${familyMode ? 'YES (include Sprout/Scout/Sovereign angles if helpful)' : 'NO (tailor primarily to this learner)'}

SHORT-TERM MEMORY (Working Session Context):
- Active topics today: ${(memory?.shortTerm?.currentSessionTopics ?? []).join('; ') || 'None yet'}
- Recent misconceptions / open threads: ${(memory?.shortTerm?.recentMisconceptions ?? []).join('; ') || 'None'}
- Current Library book: ${memory?.shortTerm?.activeBookProgress || 'None'}

LONG-TERM MEMORY (What You Have Learned About ${student?.name ?? 'this student'} Over Time):
- Learning traits & preferences: ${(memory?.longTerm?.learnedAboutStudent ?? []).join(' | ') || 'Still learning'}
- Already mastered concepts: ${(memory?.longTerm?.masteredConcepts ?? []).join(' | ') || 'None recorded yet'}
- Recurring passions: ${(memory?.longTerm?.recurringPassions ?? []).join(', ') || 'None yet'}
- Persistent skill/credit gaps: ${(memory?.longTerm?.identifiedGaps ?? []).join(' | ') || 'None noted'}

LIVE GRADUATION READINESS GAPS:
${topGaps || 'No gap data provided'}

${contextHint ? `Additional Context (from Library or Classroom): ${contextHint}\n` : ''}
Recent Conversation:
${conversationTranscript || '(New conversation)'}

Learner's New Message:
"${message}"

Instructions for Adeline:
1. Use BOTH your Short-Term Memory and Long-Term Memory of ${student?.name ?? 'the student'} so your guidance feels genuinely continuous, personal, and aware of how they learn best—never repetitive over concepts they already mastered.
2. When natural, gently connect their curiosity to one of their Graduation Readiness Gaps so they make real progress toward graduation without feeling forced into busywork.
3. Guide them through observation, evidence, or Socratic questioning rather than giving a flat textbook answer.
4. Separate what is established by direct evidence from what remains an open question or interpretation.
5. Extract memory updates from this turn:
   - newShortTermTopic: a crisp 3-7 word label of what they are exploring right now (if new)
   - newLongTermInsight: 1 concise observation about this student's thinking style, curiosity, or interest learned from their message (or empty string if nothing notable)
   - noticedGap: 1 concise skill or graduation gap surfaced (or empty string if none)
6. Recommend opening an interactive Classroom Lesson whenever this curiosity can turn into a rich investigation + reinforcing activity.`;

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
            reply: {
              type: Type.STRING,
              description:
                'Adeline’s warm, intellectually honest conversational response (2-4 concise paragraphs).',
            },
            followUpPrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 natural Socratic next questions.',
            },
            establishedFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            openQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            shouldOfferClassroom: { type: Type.BOOLEAN },
            classroomSuggestion: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                track: { type: Type.STRING },
                experienceMode: { type: Type.STRING },
                drivingQuestion: { type: Type.STRING },
              },
              required: ['topic', 'track', 'experienceMode', 'drivingQuestion'],
            },
            memoryUpdates: {
              type: Type.OBJECT,
              properties: {
                newShortTermTopic: { type: Type.STRING },
                newLongTermInsight: { type: Type.STRING },
                noticedGap: { type: Type.STRING },
              },
              required: ['newShortTermTopic', 'newLongTermInsight', 'noticedGap'],
            },
          },
          required: [
            'reply',
            'followUpPrompts',
            'establishedFacts',
            'openQuestions',
            'shouldOfferClassroom',
            'memoryUpdates',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Adeline Concierge Error:', error);
    const errMessage =
      error instanceof Error ? error.message : 'Unable to reach Adeline right now.';
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

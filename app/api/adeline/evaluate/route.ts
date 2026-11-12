import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  ADELINE_MODEL,
  DEAR_ADELINE_SYSTEM_PROMPT,
  getGeminiClient,
} from '@/lib/gemini';
import { ClassroomLesson, StudentProfile } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lesson,
      student,
      demonstrationText,
      handsOnNotes,
      checksScore,
      checksTotal,
      hoursSpent,
    }: {
      lesson: ClassroomLesson;
      student: StudentProfile;
      demonstrationText: string;
      handsOnNotes: string;
      checksScore: number;
      checksTotal: number;
      hoursSpent: number;
    } = body;

    if (!demonstrationText || demonstrationText.trim().length < 15) {
      return NextResponse.json(
        {
          error:
            'Please write a genuine explanation of what you discovered or built before submitting for mastery review.',
        },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const prompt = `Evaluate this student's demonstrated understanding for the Dear Adeline Registrar & Portfolio:

Learner: ${student?.name ?? 'Student'}, Age ${student?.age ?? 12} (${student?.gradeLabel ?? 'Scout'})
Lesson Title: ${lesson.title}
Track: ${lesson.track}
Driving Question: ${lesson.drivingQuestion}
Hands-On Mission: ${lesson.reinforcingActivity?.handsOnMission?.title}
Interactive Concept Checks Passed: ${checksScore} of ${checksTotal}
Reported Study & Lab Hours: ${hoursSpent} hours
Suggested Credit: ${lesson.creditRecommendation?.suggestedCredits ?? 0.1}

Student's Written Demonstration / Explanation:
"${demonstrationText}"

Student's Hands-On Investigation / Build Notes:
"${handsOnNotes || 'Not provided'}"

Remember the Dear Adeline Principle:
"Activity is not mastery. Exposure is not understanding. Completion is not capability."
Do NOT inflate mastery just because they typed something.
- Evaluate honestly for clarity, evidence usage, reasoning, and real understanding appropriate to a ${student?.age ?? 12}-year-old.
- Identify any specific misconceptions gently and constructively.
- Assign masteryLevel: 'Emerging' | 'Developing' | 'Demonstrated' | 'Mastery'.
- Provide 2-3 crisp evidenceSummary bullet statements for their permanent Portfolio.
- Consolidate memory: summarize 1 masteredConcept (if Demonstrated/Mastery, else empty string), 1 newLongTermInsight about how this learner reasons, and 1 remainingMisconceptionOrGap (or empty string if solid).`;

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
            masteryLevel: {
              type: Type.STRING,
              description: "One of: 'Emerging', 'Developing', 'Demonstrated', 'Mastery'",
            },
            adelineFeedback: {
              type: Type.STRING,
              description:
                'Warm, intellectually honest Socratic evaluation noting strengths, any misconceptions, and next step.',
            },
            evidenceSummary: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 concise portfolio capability statements.',
            },
            approvedCredits: {
              type: Type.NUMBER,
              description: 'Carnegie credit fraction earned (typically 0.05 to 0.50).',
            },
            nextCuriosityPrompt: {
              type: Type.STRING,
              description: 'One natural follow-up question to keep the learner growing.',
            },
            memoryConsolidation: {
              type: Type.OBJECT,
              properties: {
                masteredConcept: { type: Type.STRING },
                newLongTermInsight: { type: Type.STRING },
                remainingGap: { type: Type.STRING },
              },
              required: ['masteredConcept', 'newLongTermInsight', 'remainingGap'],
            },
          },
          required: [
            'masteryLevel',
            'adelineFeedback',
            'evidenceSummary',
            'approvedCredits',
            'nextCuriosityPrompt',
            'memoryConsolidation',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Evaluation Error:', error);
    const errMessage =
      error instanceof Error ? error.message : 'Unable to evaluate demonstration right now.';
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  DEAR_ADELINE_SYSTEM_PROMPT,
  getGeminiClient,
} from '@/lib/gemini';
import {
  OpportunityCategory,
  OpportunityItem,
  StudentMemory,
  StudentProfile,
} from '@/lib/types';

const ALLOWED_CATEGORIES: Exclude<OpportunityCategory, 'All'>[] = [
  'Art & Writing Contests',
  'Spelling & Academic Bees',
  'Science & County Fairs',
  'Grants & Scholarships',
  'Groups & Clubs',
  'Field Adventures',
];

function normalizeCategory(rawCategory: unknown): Exclude<OpportunityCategory, 'All'> {
  if (typeof rawCategory === 'string') {
    const exact = ALLOWED_CATEGORIES.find(
      (c) => c.toLowerCase() === rawCategory.trim().toLowerCase()
    );
    if (exact) return exact;
    const lower = rawCategory.toLowerCase();
    if (lower.includes('art') || lower.includes('writ') || lower.includes('essay')) {
      return 'Art & Writing Contests';
    }
    if (lower.includes('spell') || lower.includes('bee') || lower.includes('math')) {
      return 'Spelling & Academic Bees';
    }
    if (lower.includes('science') || lower.includes('fair') || lower.includes('stem')) {
      return 'Science & County Fairs';
    }
    if (lower.includes('grant') || lower.includes('scholar')) {
      return 'Grants & Scholarships';
    }
    if (lower.includes('group') || lower.includes('club') || lower.includes('4-h')) {
      return 'Groups & Clubs';
    }
  }
  return 'Field Adventures';
}

function mapRawItems(items: unknown[]): OpportunityItem[] {
  const now = Date.now();
  return items
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).title === 'string'
    )
    .map((item, idx) => ({
      id: `opp-${now}-${idx}`,
      title: String(item.title || 'Learning Opportunity'),
      organizer: String(item.organizer || 'Community / National Organizer'),
      category: normalizeCategory(item.category),
      ageRange: String(item.ageRange || 'Youth'),
      deadlineOrSeason: String(
        item.deadlineOrSeason || 'Check official page for current dates'
      ),
      locationScope: String(item.locationScope || 'Regional / National'),
      description: String(item.description || ''),
      whyItFitsStudent: String(item.whyItFitsStudent || ''),
      prepIdea: String(item.prepIdea || ''),
      url:
        typeof item.url === 'string' && item.url.startsWith('http') ? item.url : '',
    }));
}

function extractOpportunities(raw: string): OpportunityItem[] {
  if (!raw.trim()) return [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();

  // Try direct JSON object or array
  try {
    const direct = JSON.parse(candidate);
    if (Array.isArray(direct)) return mapRawItems(direct);
    if (
      direct &&
      typeof direct === 'object' &&
      Array.isArray((direct as Record<string, unknown>).opportunities)
    ) {
      return mapRawItems((direct as Record<string, unknown>).opportunities as unknown[]);
    }
  } catch {
    // Fall through to bracket slicing
  }

  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try {
      const sliced = JSON.parse(candidate.slice(start, end + 1));
      if (Array.isArray(sliced)) return mapRawItems(sliced);
    } catch {
      return [];
    }
  }

  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student,
      memory,
      category = 'All',
      location = 'Oklahoma',
      customQuery = '',
    }: {
      student: StudentProfile;
      memory?: StudentMemory;
      category?: OpportunityCategory;
      location?: string;
      customQuery?: string;
    } = body;

    const ai = getGeminiClient();

    const categoryInstruction =
      category === 'All'
        ? 'Include a rich variety across Art & Writing Contests, Spelling & Academic Bees, Science & County Fairs, Grants & Scholarships, Groups & Clubs (including 4-H, homeschool groups, maker clubs), and Field Adventures.'
        : `Focus specifically on "${category}".`;

    const prompt = `Search the live web for REAL, currently active youth opportunities, contests, fairs, groups, grants, scholarships, and hands-on adventures for this homeschool student:
- Name: ${student?.name ?? 'Student'}
- Age / Grade: ${student?.age ?? 13} (${student?.gradeLabel ?? 'Scout'})
- Interests: ${(student?.interests ?? []).join(', ') || 'Broad age-appropriate exploration across arts, sciences, civics, and outdoor adventures'}
- Long-Term Memory Notes: ${(memory?.longTerm?.learnedAboutStudent ?? []).join(' | ') || 'Clean slate — no prior assumptions yet'}
- Family Location / Region: ${location}
- Requested Focus: ${categoryInstruction}
${customQuery.trim() ? `- Specific Search Request: "${customQuery.trim()}"` : ''}

CRITICAL TRUTH & VERIFICATION RULES:
1. Use Google Search to find REAL, verifiable programs, official contest pages, local/state county fairs, 4-H/youth clubs, national spelling/art/science competitions, and real youth scholarships or micro-grants eligible for age ${student?.age ?? 13} (including homeschoolers!).
2. NEVER invent fake organizations, fake dollar amounts, fake URLs, or guessed deadlines. If a current year's exact deadline is not published on the retrieved page, state "Check official page for current cycle dates".
3. Return ONLY a JSON array inside a \`\`\`json ... \`\`\` code block with 6 real opportunities. Each object must have these exact string keys:
   - "title"
   - "organizer"
   - "category" (must be one of: "Art & Writing Contests", "Spelling & Academic Bees", "Science & County Fairs", "Grants & Scholarships", "Groups & Clubs", "Field Adventures")
   - "ageRange"
   - "deadlineOrSeason"
   - "locationScope"
   - "description" (2 concise sentences summarizing what the student actually does)
   - "whyItFitsStudent" (1 sentence connecting to ${student?.name ?? 'the student'}'s age and interests)
   - "prepIdea" (1 concrete project or Classroom prep idea)
   - "url" (real https:// URL from search results)`;

    // Use gemini-4-hydrogen with ThinkingLevel.LOW for fast, grounded web search
    const searchResponse = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: DEAR_ADELINE_SYSTEM_PROMPT,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        tools: [{ googleSearch: {} }],
      },
    });

    const partsText = (searchResponse.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('\n')
      .trim();
    const rawText = searchResponse.text?.trim() || partsText;

    // Extract grounded web sources from Google Search metadata
    const chunks =
      searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources: { title: string; uri: string }[] = [];
    const seenUris = new Set<string>();

    for (const chunk of chunks) {
      const uri = chunk?.web?.uri;
      const title = chunk?.web?.title;
      if (uri && !seenUris.has(uri)) {
        seenUris.add(uri);
        sources.push({
          title: title || uri,
          uri,
        });
      }
    }

    let opportunities = extractOpportunities(rawText);

    // If grounded search returned markdown prose instead of JSON, structure it cleanly with responseSchema
    if (opportunities.length === 0 && rawText.length > 0) {
      const structuringResponse = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Extract the real youth opportunities found in these live search findings into structured JSON without inventing any new URLs or facts:\n\nFINDINGS:\n${rawText}\n\nVERIFIED SOURCES:\n${sources.map((s) => `- ${s.title}: ${s.uri}`).join('\n')}`,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              opportunities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    organizer: { type: Type.STRING },
                    category: { type: Type.STRING },
                    ageRange: { type: Type.STRING },
                    deadlineOrSeason: { type: Type.STRING },
                    locationScope: { type: Type.STRING },
                    description: { type: Type.STRING },
                    whyItFitsStudent: { type: Type.STRING },
                    prepIdea: { type: Type.STRING },
                    url: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'organizer',
                    'category',
                    'ageRange',
                    'deadlineOrSeason',
                    'locationScope',
                    'description',
                    'whyItFitsStudent',
                    'prepIdea',
                    'url',
                  ],
                },
              },
            },
            required: ['opportunities'],
          },
        },
      });

      const structuredText = structuringResponse.text?.trim() || '{}';
      opportunities = extractOpportunities(structuredText);
    }

    // Backfill any item missing a direct URL with a grounded web source URI
    const hydrated = opportunities.map((opp, idx) => ({
      ...opp,
      url: opp.url || sources[idx]?.uri || sources[0]?.uri || '',
    }));

    return NextResponse.json({
      opportunities: hydrated,
      sources,
    });
  } catch (error) {
    console.error('Opportunities Discovery Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to search live opportunities right now.',
        opportunities: [],
        sources: [],
      },
      { status: 500 }
    );
  }
}

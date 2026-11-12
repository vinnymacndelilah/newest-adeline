import { NextRequest, NextResponse } from 'next/server';
import { ParsedBookContent } from '@/lib/types';

function stripGutenbergWrapper(raw: string): string {
  const startMatch = raw.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i);
  const endMatch = raw.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i);

  let text = raw;
  if (startMatch && startMatch.index !== undefined) {
    text = text.slice(startMatch.index + startMatch[0].length);
  }
  if (endMatch && endMatch.index !== undefined) {
    text = text.slice(0, endMatch.index);
  }
  return text.replace(/\r\n/g, '\n').trim();
}

function splitIntoChapters(cleanText: string): ParsedBookContent['chapters'] {
  const blocks = cleanText
    .split(/\n{2,}/)
    .map((b) => b.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((b) => b.length > 0);

  const chapterHeadingRegex =
    /^(?:CHAPTER|LECTURE|LETTER|FABLE|BOOK|PART|SECTION|ACT)\s+(?:[IVXLCDM]+|\d+|[A-Z]+)(?:[.:—\-\s].*)?$/i;

  const chapters: ParsedBookContent['chapters'] = [];
  let currentTitle = 'Opening & Front Matter';
  let currentParagraphs: string[] = [];
  let currentWords = 0;

  const pushChapter = () => {
    if (currentParagraphs.length === 0) return;
    chapters.push({
      index: chapters.length,
      title: currentTitle,
      paragraphs: currentParagraphs,
    });
    currentParagraphs = [];
    currentWords = 0;
  };

  for (const para of blocks) {
    const isShortHeading = para.length < 110 && chapterHeadingRegex.test(para);

    if (isShortHeading && currentParagraphs.length >= 2) {
      pushChapter();
      currentTitle = para;
      continue;
    }

    currentParagraphs.push(para);
    currentWords += para.split(/\s+/).length;

    // For books without explicit CHAPTER markers, split cleanly every ~1,100 words
    if (currentWords >= 1100 && chapters.length < 120) {
      pushChapter();
      currentTitle = `Section ${chapters.length + 1}`;
    }
  }

  pushChapter();

  if (chapters.length === 0 && blocks.length > 0) {
    chapters.push({
      index: 0,
      title: 'Full Text',
      paragraphs: blocks,
    });
  }

  return chapters;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const textUrlParam = searchParams.get('textUrl');
    const titleParam = searchParams.get('title') || 'Classic Volume';
    const authorParam = searchParams.get('author') || 'Public Domain';

    if (!idParam) {
      return NextResponse.json({ error: 'Book ID is required.' }, { status: 400 });
    }

    const id = Number(idParam);
    const candidateUrls = [
      textUrlParam,
      `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
      `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
      `https://www.gutenberg.org/files/${id}/${id}.txt`,
    ].filter((u): u is string => Boolean(u && u.startsWith('https://')));

    let rawText: string | null = null;
    let lastError = 'Book text could not be retrieved.';

    for (const url of candidateUrls) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'DearAdelineReader/1.0' },
        });
        if (res.ok) {
          const txt = await res.text();
          if (txt && txt.length > 500 && !txt.trimStart().startsWith('<!DOCTYPE html')) {
            rawText = txt;
            break;
          }
        } else {
          lastError = `Source returned HTTP ${res.status}`;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Fetch error';
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!rawText) {
      return NextResponse.json({ error: lastError }, { status: 502 });
    }

    const cleanText = stripGutenbergWrapper(rawText);
    const chapters = splitIntoChapters(cleanText);
    const totalWordCount = cleanText.split(/\s+/).length;

    const payload: ParsedBookContent = {
      id,
      title: titleParam,
      author: authorParam,
      chapters,
      totalWordCount,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Library Book Reader Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load book text.' },
      { status: 500 }
    );
  }
}

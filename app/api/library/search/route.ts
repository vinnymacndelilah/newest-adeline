import { NextRequest, NextResponse } from 'next/server';
import { CURATED_LIBRARY_BOOKS } from '@/lib/initial-data';
import { LibraryBookSummary } from '@/lib/types';

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseOpdsEntries(xml: string, fallbackSubject: string): LibraryBookSummary[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const books: LibraryBookSummary[] = [];

  for (const entry of entries) {
    const idMatch = entry.match(/<id>https?:\/\/www\.gutenberg\.org\/ebooks\/(\d+)\.opds<\/id>/);
    if (!idMatch) continue;

    const id = Number(idMatch[1]);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const authorMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);

    const title = titleMatch ? decodeXmlEntities(titleMatch[1]) : `Volume #${id}`;
    const author = authorMatch ? decodeXmlEntities(authorMatch[1]) : 'Public Domain';

    books.push({
      id,
      title,
      authors: author ? [author] : ['Public Domain'],
      subjects: [fallbackSubject],
      downloadCount: 1000,
      coverUrl: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
      textUrl: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
      htmlUrl: `https://www.gutenberg.org/ebooks/${id}`,
    });
  }

  return books;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const topic = (searchParams.get('topic') || '').trim();

  // Instant response for the default Curated Shelf (0ms, no external bottleneck)
  if (!q && (!topic || topic === 'Curated Shelf')) {
    return NextResponse.json({ books: CURATED_LIBRARY_BOOKS });
  }

  const queryTerm = q || topic;

  try {
    const opdsUrl = `https://www.gutenberg.org/ebooks/search.opds/?query=${encodeURIComponent(queryTerm)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(opdsUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/atom+xml,application/xml,text/xml',
        'User-Agent': 'DearAdelineLibrary/1.0',
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Project Gutenberg search returned status ${res.status}`);
    }

    const xml = await res.text();
    const books = parseOpdsEntries(xml, topic || 'Project Gutenberg').slice(0, 24);

    if (books.length === 0) {
      const localMatches = CURATED_LIBRARY_BOOKS.filter(
        (b) =>
          b.title.toLowerCase().includes(queryTerm.toLowerCase()) ||
          b.authors.some((a) => a.toLowerCase().includes(queryTerm.toLowerCase())) ||
          b.subjects.some((s) => s.toLowerCase().includes(queryTerm.toLowerCase()))
      );
      return NextResponse.json({ books: localMatches });
    }

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Library Search Fallback:', error);
    // Graceful local search fallback if upstream search is slow/aborted
    const lower = queryTerm.toLowerCase();
    const localMatches = CURATED_LIBRARY_BOOKS.filter(
      (b) =>
        b.title.toLowerCase().includes(lower) ||
        b.authors.some((a) => a.toLowerCase().includes(lower)) ||
        b.subjects.some((s) => s.toLowerCase().includes(lower))
    );
    return NextResponse.json({
      books: localMatches.length > 0 ? localMatches : CURATED_LIBRARY_BOOKS,
    });
  }
}

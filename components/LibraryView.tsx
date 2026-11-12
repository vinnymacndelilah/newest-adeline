'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  LibraryBookSummary,
  ParsedBookContent,
  RegistrarEntry,
  StudentProfile,
  TrackName,
} from '@/lib/types';

interface LibraryViewProps {
  student: StudentProfile;
  bookmarks: Record<number, number>;
  onUpdateBookmark: (bookId: number, chapterIndex: number, bookTitle?: string) => void;
  onLogReading: (entry: RegistrarEntry) => void;
  onLaunchClassroomFromBook: (params: {
    topic: string;
    track?: TrackName;
    sourceContext: string;
  }) => void;
  onAskAdelineFromBook: (question: string, contextHint: string) => void;
}

const SHELVES = [
  'Curated Shelf',
  'Science',
  'History',
  'Literature',
  'Philosophy',
  'Children',
];

export default function LibraryView({
  student,
  bookmarks,
  onUpdateBookmark,
  onLogReading,
  onLaunchClassroomFromBook,
  onAskAdelineFromBook,
}: LibraryViewProps) {
  const [books, setBooks] = useState<LibraryBookSummary[]>([]);
  const [activeShelf, setActiveShelf] = useState('Curated Shelf');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [nookImgError, setNookImgError] = useState(false);

  // Reader state
  const [selectedBook, setSelectedBook] = useState<LibraryBookSummary | null>(null);
  const [bookContent, setBookContent] = useState<ParsedBookContent | null>(null);
  const [loadingBook, setLoadingBook] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [loggedBookNotice, setLoggedBookNotice] = useState<string | null>(null);
  const [passageQuestion, setPassageQuestion] = useState('');

  const fetchCatalog = async (q: string, topic: string) => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      else if (topic && topic !== 'Curated Shelf') params.set('topic', topic);

      const res = await fetch(`/api/library/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load books.');
      setBooks(data.books ?? []);
    } catch (err) {
      setCatalogError(
        err instanceof Error ? err.message : 'Unable to reach the Living Library.'
      );
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/library/search');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load books.');
        if (active) setBooks(data.books ?? []);
      } catch (err) {
        if (active) {
          setCatalogError(
            err instanceof Error ? err.message : 'Unable to reach the Living Library.'
          );
        }
      } finally {
        if (active) setLoadingCatalog(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openBook = async (book: LibraryBookSummary) => {
    setSelectedBook(book);
    setBookContent(null);
    setBookError(null);
    setLoadingBook(true);
    setLoggedBookNotice(null);

    try {
      const params = new URLSearchParams({
        id: String(book.id),
        title: book.title,
        author: book.authors[0] || 'Public Domain',
      });
      if (book.textUrl) params.set('textUrl', book.textUrl);

      const res = await fetch(`/api/library/book?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open full text.');
      setBookContent(data);
      const savedIdx = bookmarks[book.id] ?? 0;
      setChapterIdx(Math.min(savedIdx, Math.max(0, (data.chapters?.length ?? 1) - 1)));
    } catch (err) {
      setBookError(err instanceof Error ? err.message : 'Unable to open book text.');
    } finally {
      setLoadingBook(false);
    }
  };

  const handleChangeChapter = (nextIdx: number) => {
    if (!bookContent || !selectedBook) return;
    const clamped = Math.max(0, Math.min(nextIdx, bookContent.chapters.length - 1));
    setChapterIdx(clamped);
    onUpdateBookmark(selectedBook.id, clamped, selectedBook.title);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogReadingSession = () => {
    if (!bookContent || !selectedBook) return;
    const chapter = bookContent.chapters[chapterIdx];
    const today = new Date().toISOString().split('T')[0];

    onLogReading({
      id: `reg-lib-${Date.now()}`,
      studentId: student.id,
      date: today,
      title: `${selectedBook.title} — ${chapter?.title || 'Reading'}`,
      track: 'Literature & Rhetoric',
      creditCategory: 'Literature & Rhetoric',
      hours: 1.0,
      creditsEarned: 0.05,
      masteryLevel: 'Demonstrated',
      witnessVerified: false,
      sourceType: 'library',
      notes: `Read "${chapter?.title}" (${bookContent.author}) in the Dear Adeline Living Library.`,
    });
    setLoggedBookNotice(`Logged 1.0h (+0.05 Literature credit) to ${student.name}’s Registrar.`);
  };

  // ACTIVE BOOK READER VIEW
  if (selectedBook) {
    const activeChapter = bookContent?.chapters[chapterIdx];

    return (
      <div className="space-y-6">
        {/* Reader Top Control Bar */}
        <div className="bg-white border border-[#DCE2D8] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedBook(null);
              setBookContent(null);
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DCE2D8] bg-[#FAF9F5] hover:bg-[#EEF1EC] text-xs font-semibold text-[#1A241E] inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Library</span>
          </button>

          <div className="flex-1 min-w-[200px]">
            <h2 className="font-editorial text-lg sm:text-xl font-semibold text-[#1A241E] truncate">
              {selectedBook.title}
            </h2>
            <p className="text-xs text-[#55635A] truncate">
              {selectedBook.authors.join(', ') || 'Public Domain Classic'}
              {bookContent ? ` · ${bookContent.totalWordCount.toLocaleString()} words` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-[#EEF1EC] rounded-lg">
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setFontSize(sz)}
                  className={`min-h-[36px] min-w-[36px] px-2.5 rounded-md text-xs font-semibold uppercase ${
                    fontSize === sz ? 'bg-white text-[#1A241E] shadow-sm' : 'text-[#55635A]'
                  }`}
                >
                  {sz === 'sm' ? 'A-' : sz === 'md' ? 'A' : 'A+'}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!bookContent}
              onClick={handleLogReadingSession}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#234E36] hover:bg-[#1A3B29] disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap"
            >
              <BookMarked className="w-4 h-4" />
              <span>Log Reading Credit</span>
            </button>
          </div>
        </div>

        {loggedBookNotice && (
          <div className="p-3.5 rounded-xl bg-[#EEF1EC] border border-[#234E36]/30 text-xs font-medium text-[#234E36] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{loggedBookNotice}</span>
          </div>
        )}

        {loadingBook ? (
          <div className="bg-white border border-[#DCE2D8] rounded-2xl p-12 text-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#234E36] mx-auto" />
            <p className="font-editorial text-lg text-[#1A241E]">
              Opening volume from Project Gutenberg...
            </p>
          </div>
        ) : bookError ? (
          <div className="bg-white border border-[#DCE2D8] rounded-2xl p-8 space-y-4">
            <p className="text-sm font-semibold text-red-800">Could not load book text</p>
            <p className="text-xs text-[#55635A]">{bookError}</p>
            <button
              type="button"
              onClick={() => openBook(selectedBook)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#234E36] text-white text-xs font-semibold"
            >
              Retry Loading Text
            </button>
          </div>
        ) : (
          bookContent &&
          activeChapter && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Chapter Text Surface */}
              <article className="lg:col-span-8 bg-white border border-[#DCE2D8] rounded-2xl p-6 sm:p-10 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#DCE2D8]">
                  <div>
                    <span className="text-xs font-mono tabular-nums text-[#55635A]">
                      Chapter {chapterIdx + 1} of {bookContent.chapters.length}
                    </span>
                    <h3 className="font-editorial text-2xl font-semibold text-[#1A241E]">
                      {activeChapter.title}
                    </h3>
                  </div>

                  <select
                    aria-label="Select Chapter"
                    value={chapterIdx}
                    onChange={(e) => handleChangeChapter(Number(e.target.value))}
                    className="min-h-[42px] max-w-[240px] px-3 py-1.5 rounded-xl border border-[#DCE2D8] bg-[#FAF9F5] text-xs font-medium text-[#1A241E]"
                  >
                    {bookContent.chapters.map((ch) => (
                      <option key={ch.index} value={ch.index}>
                        {ch.index + 1}. {ch.title.slice(0, 48)}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={`mx-auto max-w-[65ch] space-y-5 font-editorial text-[#1A241E] ${
                    fontSize === 'sm'
                      ? 'text-sm leading-[1.75]'
                      : fontSize === 'lg'
                      ? 'text-lg leading-[1.85]'
                      : 'text-base leading-[1.8]'
                  }`}
                >
                  {activeChapter.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                <div className="pt-6 border-t border-[#DCE2D8] flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={chapterIdx === 0}
                    onClick={() => handleChangeChapter(chapterIdx - 1)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DCE2D8] text-xs font-semibold text-[#1A241E] disabled:opacity-40 inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={chapterIdx >= bookContent.chapters.length - 1}
                    onClick={() => handleChangeChapter(chapterIdx + 1)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#234E36] text-white text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-2"
                  >
                    <span>Next Chapter</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>

              {/* Adeline Reading Companion Sidebar */}
              <aside className="lg:col-span-4 space-y-5">
                <div className="bg-white border border-[#DCE2D8] rounded-2xl p-5 space-y-4">
                  <h4 className="font-editorial text-lg font-semibold text-[#1A241E]">
                    Read With Adeline
                  </h4>
                  <p className="text-xs text-[#55635A] leading-relaxed">
                    Turn this chapter into an interactive Classroom investigation—or ask Adeline a
                    question about vocabulary, historical context, or ideas in this section.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      onLaunchClassroomFromBook({
                        topic: `${selectedBook.title}: ${activeChapter.title}`,
                        track: 'Literature & Rhetoric',
                        sourceContext: `Book "${selectedBook.title}" by ${bookContent.author}, Chapter "${activeChapter.title}". Excerpt: ${activeChapter.paragraphs.slice(0, 3).join(' ').slice(0, 900)}`,
                      })
                    }
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#234E36] hover:bg-[#1A3B29] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Turn Chapter Into Classroom</span>
                  </button>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!passageQuestion.trim()) return;
                      onAskAdelineFromBook(
                        passageQuestion.trim(),
                        `Reading "${selectedBook.title}" by ${bookContent.author}, "${activeChapter.title}": ${activeChapter.paragraphs.slice(0, 2).join(' ').slice(0, 700)}`
                      );
                      setPassageQuestion('');
                    }}
                    className="space-y-2 pt-2 border-t border-[#DCE2D8]"
                  >
                    <label
                      htmlFor="book-adeline-q"
                      className="block text-xs font-medium text-[#1A241E]"
                    >
                      Ask Adeline about this chapter
                    </label>
                    <input
                      id="book-adeline-q"
                      type="text"
                      value={passageQuestion}
                      onChange={(e) => setPassageQuestion(e.target.value)}
                      placeholder="e.g., What does this passage mean?"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#DCE2D8] bg-[#FAF9F5] text-xs text-[#1A241E]"
                    />
                    <button
                      type="submit"
                      disabled={!passageQuestion.trim()}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#DCE2D8] bg-[#FAF9F5] hover:bg-[#EEF1EC] text-xs font-semibold text-[#1A241E] disabled:opacity-40"
                    >
                      Ask in Concierge
                    </button>
                  </form>
                </div>
              </aside>
            </div>
          )
        )}
      </div>
    );
  }

  // LIBRARY CATALOG VIEW
  return (
    <div className="space-y-8">
      {/* Library Editorial Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-[#fbf5ea] border border-[#e9ece5] rounded-[28px] overflow-hidden">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <p className="font-hand text-xl text-[#d78472]">
              The Living Library · Project Gutenberg Full-Text Catalog
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-[#294c35]">
              Real Primary Books Ready to Read on the Site
            </h1>
            <p className="text-sm text-[#68726c] leading-relaxed max-w-xl">
              Browse curated living books or search thousands of public-domain classics, natural
              history lectures, letters, and fables. Read chapter by chapter and turn any passage
              into a Classroom lesson.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchCatalog(searchQuery, activeShelf);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#68726c] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or author (e.g. Faraday, Aesop, Douglass, Euclid, Alcott)..."
                className="w-full min-h-[46px] pl-10 pr-4 py-2 rounded-full border border-[#dce7d5] bg-[#fffdf9] text-sm text-[#303734]"
              />
            </div>
            <button
              type="submit"
              className="min-h-[46px] px-6 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold whitespace-nowrap transition-colors"
            >
              Search Catalog
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 relative min-h-[190px] bg-[#EEF1EC]">
          {!nookImgError ? (
            <img
              src="/images/library_reading_nook_1794514270270.jpg"
              alt="Clothbound classic books arranged on warm oak shelves beside a sunlit window bench"
              referrerPolicy="no-referrer"
              onError={() => setNookImgError(true)}
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <BookOpen className="w-8 h-8 text-[#234E36] mb-2" />
              <p className="font-editorial text-sm text-[#1A241E]">Dear Adeline Reading Nook</p>
            </div>
          )}
        </div>
      </section>

      {/* Shelf Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#EEF1EC] rounded-xl w-fit">
        {SHELVES.map((shelf) => (
          <button
            key={shelf}
            type="button"
            onClick={() => {
              setActiveShelf(shelf);
              setSearchQuery('');
              fetchCatalog('', shelf);
            }}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeShelf === shelf && !searchQuery
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#55635A] hover:text-[#1A241E]'
            }`}
          >
            {shelf}
          </button>
        ))}
      </div>

      {/* Book Grid */}
      {loadingCatalog ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#234E36] mx-auto" />
          <p className="text-sm text-[#55635A]">Fetching volumes from the Living Library...</p>
        </div>
      ) : catalogError ? (
        <div className="bg-white border border-[#DCE2D8] rounded-2xl p-6 space-y-3">
          <p className="text-sm font-semibold text-red-800">{catalogError}</p>
          <button
            type="button"
            onClick={() => fetchCatalog(searchQuery, activeShelf)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#234E36] text-white text-xs font-semibold"
          >
            Retry Catalog
          </button>
        </div>
      ) : books.length === 0 ? (
        <div className="bg-white border border-[#DCE2D8] rounded-2xl p-10 text-center space-y-2">
          <p className="font-editorial text-xl text-[#1A241E]">No matching volumes found</p>
          <p className="text-sm text-[#55635A]">
            Try searching another author name, classic work, or switch back to the Curated Shelf.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((book) => (
            <article
              key={book.id}
              className="bg-white border border-[#DCE2D8] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#234E36]/50 transition-colors"
            >
              <div className="flex gap-4 items-start">
                <BookCoverThumb coverUrl={book.coverUrl} title={book.title} />
                <div className="space-y-1.5 min-w-0">
                  <h3 className="font-editorial text-base font-semibold text-[#1A241E] leading-snug line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-xs text-[#55635A] truncate">
                    {book.authors[0] || 'Public Domain'}
                  </p>
                  <p className="text-[11px] text-[#55635A]/90 line-clamp-2">
                    {book.subjects.slice(0, 2).join(' · ') || 'Classic Literature'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#DCE2D8]">
                <span className="text-xs font-mono tabular-nums text-[#55635A]">
                  {bookmarks[book.id] !== undefined
                    ? `Ch. ${bookmarks[book.id] + 1} saved`
                    : `${book.downloadCount.toLocaleString()} readers`}
                </span>
                <button
                  type="button"
                  onClick={() => openBook(book)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#234E36] hover:bg-[#1A3B29] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{bookmarks[book.id] !== undefined ? 'Continue Reading' : 'Read Book'}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function BookCoverThumb({
  coverUrl,
  title,
}: {
  coverUrl: string | null;
  title: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!coverUrl || failed) {
    return (
      <div className="w-16 h-24 rounded-lg bg-[#EEF1EC] border border-[#DCE2D8] flex flex-col items-center justify-center p-2 text-center shrink-0">
        <BookOpen className="w-5 h-5 text-[#234E36] mb-1" />
        <span className="text-[9px] font-editorial text-[#55635A] line-clamp-2 leading-tight">
          {title}
        </span>
      </div>
    );
  }

  return (
    <img
      src={coverUrl}
      alt={`Cover of ${title}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-16 h-24 rounded-lg object-cover border border-[#DCE2D8] shrink-0 bg-[#EEF1EC]"
    />
  );
}

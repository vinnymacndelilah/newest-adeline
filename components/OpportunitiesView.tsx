'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Compass,
  ExternalLink,
  Globe,
  GraduationCap,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  CreditCategory,
  ExperienceMode,
  OpportunityCategory,
  OpportunityItem,
  RegistrarEntry,
  SavedOpportunity,
  StudentMemory,
  StudentProfile,
  TrackName,
} from '@/lib/types';

export interface GroundedSource {
  title: string;
  uri: string;
}

export interface OpportunitySearchSnapshot {
  studentId: string;
  location: string;
  category: OpportunityCategory;
  customQuery: string;
  opportunities: OpportunityItem[];
  sources: GroundedSource[];
  searchedAt: string;
}

interface OpportunitiesViewProps {
  student: StudentProfile;
  memory: StudentMemory;
  savedOpportunities: SavedOpportunity[];
  cachedSnapshot?: OpportunitySearchSnapshot;
  onCacheSnapshot: (snapshot: OpportunitySearchSnapshot) => void;
  onSaveOpportunity: (opp: OpportunityItem) => void;
  onUpdateStatus: (
    id: string,
    status: SavedOpportunity['status']
  ) => void;
  onDeleteSaved: (id: string) => void;
  onPrepareInClassroom: (params: {
    topic: string;
    track: TrackName;
    experienceMode: ExperienceMode;
    sourceContext: string;
  }) => void;
  onLogCompletedToRegistrar: (entry: RegistrarEntry, opportunityTitle: string) => void;
}

const CATEGORIES: OpportunityCategory[] = [
  'All',
  'Art & Writing Contests',
  'Spelling & Academic Bees',
  'Science & County Fairs',
  'Grants & Scholarships',
  'Groups & Clubs',
  'Field Adventures',
];

const STATUS_ORDER: SavedOpportunity['status'][] = [
  'Exploring',
  'Preparing Entry',
  'Submitted',
  'Completed',
];

function mapOpportunityToTrackAndCredit(opp: OpportunityItem): {
  track: TrackName;
  creditCategory: CreditCategory;
  experienceMode: ExperienceMode;
} {
  const lowerTitle = `${opp.title} ${opp.description}`.toLowerCase();
  switch (opp.category) {
    case 'Art & Writing Contests':
      if (
        lowerTitle.includes('art') ||
        lowerTitle.includes('paint') ||
        lowerTitle.includes('draw') ||
        lowerTitle.includes('photo') ||
        lowerTitle.includes('poster')
      ) {
        return {
          track: 'Creative Economy & Practical Arts',
          creditCategory: 'Practical Arts & Economy',
          experienceMode: 'STEAM',
        };
      }
      return {
        track: 'Literature & Rhetoric',
        creditCategory: 'Literature & Rhetoric',
        experienceMode: 'investigation',
      };
    case 'Spelling & Academic Bees':
      return {
        track: 'Literature & Rhetoric',
        creditCategory: 'Literature & Rhetoric',
        experienceMode: 'investigation',
      };
    case 'Science & County Fairs':
      return {
        track: "God's Creation & Science",
        creditCategory: 'Laboratory Science',
        experienceMode: 'STEM',
      };
    case 'Grants & Scholarships':
      return {
        track: 'Creative Economy & Practical Arts',
        creditCategory: 'Civics & Economics',
        experienceMode: 'civic-action project',
      };
    case 'Groups & Clubs':
      return {
        track: 'Discipleship & Stewardship',
        creditCategory: 'Worldview & Stewardship',
        experienceMode: 'family project',
      };
    case 'Field Adventures':
    default:
      return {
        track: 'Truth-Based History',
        creditCategory: 'Humanities & History',
        experienceMode: 'investigation',
      };
  }
}

function resolveClassroomMode(opp: OpportunityItem): ExperienceMode {
  switch (opp.category) {
    case 'Science & County Fairs':
      return 'STEM';
    case 'Art & Writing Contests':
      return 'STEAM';
    case 'Grants & Scholarships':
      return 'public-interest investigation';
    case 'Groups & Clubs':
      return 'family project';
    default:
      return 'investigation';
  }
}

export default function OpportunitiesView({
  student,
  memory,
  savedOpportunities,
  cachedSnapshot,
  onCacheSnapshot,
  onSaveOpportunity,
  onUpdateStatus,
  onDeleteSaved,
  onPrepareInClassroom,
  onLogCompletedToRegistrar,
}: OpportunitiesViewProps) {
  const [location, setLocation] = useState(cachedSnapshot?.location || 'Oklahoma');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory>(
    cachedSnapshot?.category || 'All'
  );
  const [customQuery, setCustomQuery] = useState(cachedSnapshot?.customQuery || '');
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(
    cachedSnapshot?.opportunities || []
  );
  const [sources, setSources] = useState<GroundedSource[]>(
    cachedSnapshot?.sources || []
  );
  const [isScouting, setIsScouting] = useState(!cachedSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [loggedIds, setLoggedIds] = useState<Record<string, boolean>>({});
  const activeControllerRef = React.useRef<AbortController | null>(null);

  const studentSaved = savedOpportunities.filter((s) => s.studentId === student.id);
  const savedKeySet = new Set(
    studentSaved.map((s) => `${s.title.toLowerCase()}::${s.organizer.toLowerCase()}`)
  );

  const runLiveScout = async (params: {
    cat: OpportunityCategory;
    loc: string;
    query: string;
  }) => {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 35000);

    setIsScouting(true);
    setError(null);
    try {
      const res = await fetch('/api/opportunities/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          student,
          memory,
          category: params.cat,
          location: params.loc.trim() || 'United States',
          customQuery: params.query.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not scout live opportunities right now.');
      }
      const nextOpps: OpportunityItem[] = data.opportunities ?? [];
      const nextSources: GroundedSource[] = data.sources ?? [];
      setOpportunities(nextOpps);
      setSources(nextSources);
      onCacheSnapshot({
        studentId: student.id,
        location: params.loc.trim() || 'United States',
        category: params.cat,
        customQuery: params.query.trim(),
        opportunities: nextOpps,
        sources: nextSources,
        searchedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Live search took too long or was cancelled. Click Try Again to run a fresh search.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Unable to scout live opportunities right now.'
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsScouting(false);
    }
  };

  // Initial automatic live scout once when visiting a student without cached results
  useEffect(() => {
    if (cachedSnapshot && cachedSnapshot.opportunities.length > 0) {
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 35000);

    (async () => {
      try {
        const res = await fetch('/api/opportunities/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            student,
            memory,
            category: 'All',
            location: 'Oklahoma',
            customQuery: '',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Unable to load opportunities right now.');
        }
        const nextOpps: OpportunityItem[] = data.opportunities ?? [];
        const nextSources: GroundedSource[] = data.sources ?? [];
        // Always persist to parent cache even if component unmounted mid-flight
        onCacheSnapshot({
          studentId: student.id,
          location: 'Oklahoma',
          category: 'All',
          customQuery: '',
          opportunities: nextOpps,
          sources: nextSources,
          searchedAt: new Date().toISOString(),
        });
        if (!active) return;
        setOpportunities(nextOpps);
        setSources(nextSources);
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Live web search timed out. Click Try Again to scout opportunities.');
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to scout live opportunities right now.'
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (active) {
          setIsScouting(false);
        }
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [student.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrepare = (opp: OpportunityItem) => {
    const mapped = mapOpportunityToTrackAndCredit(opp);
    const mode = resolveClassroomMode(opp);
    onPrepareInClassroom({
      topic: `Preparing for ${opp.title} (${opp.organizer})`,
      track: mapped.track,
      experienceMode: mode,
      sourceContext: `REAL OPPORTUNITY PREPARATION — Organizer: ${opp.organizer}. Category: ${opp.category}. Age Range: ${opp.ageRange}. Deadline/Season: ${opp.deadlineOrSeason}. Description: ${opp.description}. Preparation Focus: ${opp.prepIdea}`,
    });
  };

  const handleLogSaved = (saved: SavedOpportunity) => {
    const mapped = mapOpportunityToTrackAndCredit(saved);
    const entry: RegistrarEntry = {
      id: `reg-opp-${Date.now()}`,
      studentId: student.id,
      date: new Date().toISOString().split('T')[0],
      title: `${saved.title} (${saved.organizer})`,
      track: mapped.track,
      creditCategory: mapped.creditCategory,
      hours: 6,
      creditsEarned: 0.05,
      masteryLevel: 'Demonstrated',
      witnessVerified: true,
      sourceType: 'practical-life',
      notes: `Real-world participation in ${saved.category}: ${saved.description}`,
    };
    onLogCompletedToRegistrar(entry, saved.title);
    onUpdateStatus(saved.id, 'Completed');
    setLoggedIds((prev) => ({ ...prev, [saved.id]: true }));
  };

  return (
    <div className="space-y-8">
      {/* Cream Storybook Scouting Hero */}
      <section className="bg-[#fbf5ea] border border-[#e9ece5] rounded-[28px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <p className="font-hand text-xl text-[#d78472]">
              Real-World Stage · Live Web Scouting
            </p>
            <h1 className="font-display text-3xl sm:text-5xl text-[#294c35] leading-tight">
              Opportunities &amp; Adventures
            </h1>
            <p className="text-sm sm:text-base text-[#68726c] leading-relaxed">
              Adeline searches the live web for real art and writing contests, spelling bees,
              science and county fairs, 4-H and youth clubs, grants, scholarships, and field
              adventures matched to <span className="font-bold text-[#294c35]">{student.name}</span>{' '}
              (Age {student.age}
              {student.interests.length > 0 ? ` · ${student.interests.slice(0, 3).join(', ')}` : ''}
              ).
            </p>
          </div>

          <div className="text-xs text-[#68726c] font-mono tabular-nums shrink-0">
            <span>{studentSaved.length} saved for {student.name}</span>
          </div>
        </div>

        {/* Live Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runLiveScout({
              cat: selectedCategory,
              loc: location,
              query: customQuery,
            });
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
        >
          <div className="md:col-span-3 relative">
            <MapPin className="w-4 h-4 text-[#7c9a61] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or State (e.g., Oklahoma)"
              aria-label="Family location or region"
              className="w-full min-h-[46px] pl-10 pr-3 py-2 rounded-2xl border border-[#dce7d5] bg-[#fffdf9] text-sm text-[#303734]"
            />
          </div>

          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-[#7c9a61] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder={`Search specific opportunities for ${student.name} (e.g., watercolor, spelling bee, grant)...`}
              aria-label="Custom opportunity search"
              className="w-full min-h-[46px] pl-10 pr-3 py-2 rounded-2xl border border-[#dce7d5] bg-[#fffdf9] text-sm text-[#303734]"
            />
          </div>

          <button
            type="submit"
            disabled={isScouting}
            className="md:col-span-3 min-h-[46px] px-5 py-2.5 rounded-full bg-[#7c9a61] hover:bg-[#294c35] disabled:opacity-60 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            {isScouting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scouting Web...</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Scout Live Opportunities</span>
              </>
            )}
          </button>
        </form>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                disabled={isScouting}
                onClick={() => {
                  setSelectedCategory(cat);
                  runLiveScout({
                    cat,
                    loc: location,
                    query: customQuery,
                  });
                }}
                className={`min-h-[40px] px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${
                  active
                    ? 'bg-[#294c35] text-white border-[#294c35]'
                    : 'bg-[#fffdf9] text-[#294c35] border-[#dce7d5] hover:bg-[#f7f8f4]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() =>
              runLiveScout({
                cat: selectedCategory,
                loc: location,
                query: customQuery,
              })
            }
            className="min-h-[38px] px-4 py-1.5 rounded-full bg-[#294c35] text-white font-bold self-start sm:self-auto"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main Content Split: Discovered Live Opportunities + Saved Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Live Discovered Opportunities (Left 8 cols) */}
        <section className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-hand text-base text-[#d78472]">Live Web Results</span>
              <h2 className="font-display text-2xl text-[#294c35]">
                Matched for {student.name} · {selectedCategory}
              </h2>
            </div>
            {!isScouting && opportunities.length > 0 && (
              <span className="text-xs font-mono tabular-nums text-[#68726c]">
                {opportunities.length} verified leads
              </span>
            )}
          </div>

          {isScouting ? (
            <div className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#7c9a61] mx-auto" />
              <p className="font-display text-2xl text-[#294c35]">
                Searching live contests, fairs, clubs &amp; grants...
              </p>
              <p className="text-xs text-[#68726c] max-w-md mx-auto leading-relaxed">
                Checking current programs in {location || 'your region'} for {student.name} (Age{' '}
                {student.age}) with Google Search grounding so every link is real and verifiable.
              </p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-8 text-center space-y-4">
              <Compass className="w-8 h-8 text-[#7c9a61] mx-auto" />
              <div className="space-y-1">
                <p className="font-display text-2xl text-[#294c35]">
                  Ready to Scout Real Opportunities
                </p>
                <p className="text-xs text-[#68726c]">
                  Try broadening your location (e.g., Oklahoma or United States) or click Scout Live Opportunities above.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  runLiveScout({
                    cat: selectedCategory,
                    loc: location,
                    query: customQuery,
                  })
                }
                className="min-h-[44px] px-5 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Scout Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opp) => {
                const isSaved = savedKeySet.has(
                  `${opp.title.toLowerCase()}::${opp.organizer.toLowerCase()}`
                );
                return (
                  <article
                    key={opp.id}
                    className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 sm:p-6 space-y-4 shadow-[0_6px_18px_rgba(44,57,48,0.05)]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-hand text-base text-[#d78472]">
                          {opp.category} · {opp.organizer}
                        </span>
                        <h3 className="font-display text-2xl text-[#294c35] leading-snug">
                          {opp.title}
                        </h3>
                      </div>

                      {opp.url && (
                        <a
                          href={opp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea] hover:bg-[#f7f8f4] text-xs font-bold text-[#294c35] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start"
                        >
                          <span>Official Page</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#7c9a61]" />
                        </a>
                      )}
                    </div>

                    <p className="text-xs font-mono tabular-nums text-[#68726c]">
                      Age: {opp.ageRange} · Timing: {opp.deadlineOrSeason} · Scope:{' '}
                      {opp.locationScope}
                    </p>

                    <p className="text-sm text-[#303734] leading-relaxed">{opp.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-2xl bg-[#fbf5ea]/75 border border-[#e9ece5] space-y-1">
                        <p className="text-xs font-bold text-[#294c35]">
                          Why It Fits {student.name}
                        </p>
                        <p className="text-xs text-[#68726c] leading-relaxed">
                          {opp.whyItFitsStudent}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-[#f7f8f4] border border-[#dce7d5] space-y-1">
                        <p className="text-xs font-bold text-[#294c35]">How to Prepare</p>
                        <p className="text-xs text-[#68726c] leading-relaxed">{opp.prepIdea}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#e9ece5] flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handlePrepare(opp)}
                        className="min-h-[44px] px-5 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold inline-flex items-center gap-2 transition-colors"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>Prepare Entry in Classroom</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSaved}
                        onClick={() => onSaveOpportunity(opp)}
                        className={`min-h-[44px] px-4 py-2 rounded-full border text-xs font-bold inline-flex items-center gap-2 transition-colors ${
                          isSaved
                            ? 'border-[#7c9a61] bg-[#f7f8f4] text-[#294c35]'
                            : 'border-[#dce7d5] bg-white hover:bg-[#fbf5ea] text-[#294c35]'
                        }`}
                      >
                        {isSaved ? (
                          <>
                            <BookmarkCheck className="w-4 h-4 text-[#7c9a61]" />
                            <span>Saved to {student.name}’s Board</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 text-[#7c9a61]" />
                            <span>Save to Tracker</span>
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Grounded Web Sources */}
          {sources.length > 0 && (
            <div className="bg-[#fbf5ea] border border-[#e9ece5] rounded-[24px] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#294c35]">
                <Globe className="w-4 h-4 text-[#7c9a61]" />
                <span>Verified Web Sources Consulted ({sources.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sources.slice(0, 8).map((src, idx) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-white border border-[#e9ece5] hover:border-[#7c9a61] text-xs text-[#294c35] flex items-center justify-between gap-2 transition-colors"
                  >
                    <span className="truncate font-semibold">{src.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#7c9a61] shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Saved Opportunities Tracker (Right 4 cols) */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 space-y-4 shadow-[0_8px_22px_rgba(44,57,48,0.06)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-hand text-base text-[#d78472]">Action Board</span>
                <h2 className="font-display text-2xl text-[#294c35]">
                  {student.name}’s Saved Tracker
                </h2>
              </div>
              <Award className="w-5 h-5 text-[#d89a3c] shrink-0" />
            </div>

            {studentSaved.length === 0 ? (
              <p className="text-xs text-[#68726c] leading-relaxed py-3">
                Save any contest, county fair, scholarship, club, or adventure to track deadlines,
                prepare your entry in Classroom, and log completed experiences to the Registrar.
              </p>
            ) : (
              <div className="space-y-3">
                {studentSaved.map((saved) => {
                  const isLogged = loggedIds[saved.id] || saved.status === 'Completed';
                  return (
                    <div
                      key={saved.id}
                      className="p-4 rounded-2xl bg-[#fbf5ea]/75 border border-[#e9ece5] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-hand text-xs text-[#d78472]">{saved.category}</p>
                          <h3 className="font-bold text-sm text-[#294c35] leading-snug">
                            {saved.title}
                          </h3>
                          <p className="text-xs text-[#68726c] truncate">{saved.organizer}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${saved.title}`}
                          onClick={() => onDeleteSaved(saved.id)}
                          className="min-h-[36px] min-w-[36px] rounded-lg text-[#68726c] hover:text-red-700 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`status-${saved.id}`}
                          className="text-[11px] font-bold text-[#68726c]"
                        >
                          Stage:
                        </label>
                        <select
                          id={`status-${saved.id}`}
                          value={saved.status}
                          onChange={(e) =>
                            onUpdateStatus(
                              saved.id,
                              e.target.value as SavedOpportunity['status']
                            )
                          }
                          className="flex-1 min-h-[36px] px-2.5 py-1 rounded-xl border border-[#dce7d5] bg-white text-xs font-bold text-[#294c35]"
                        >
                          {STATUS_ORDER.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handlePrepare(saved)}
                          className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-[#dce7d5] bg-white hover:bg-[#f7f8f4] text-xs font-bold text-[#294c35] inline-flex items-center justify-center gap-1.5"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-[#7c9a61]" />
                          <span>Prep Entry</span>
                        </button>

                        {!isLogged ? (
                          <button
                            type="button"
                            onClick={() => handleLogSaved(saved)}
                            className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#294c35] hover:bg-[#7c9a61] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Log Credit</span>
                          </button>
                        ) : (
                          <span className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#f7f8f4] border border-[#dce7d5] text-xs font-bold text-[#7c9a61] inline-flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Logged</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

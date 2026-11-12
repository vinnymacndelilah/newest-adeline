'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  BookOpen,
  ClipboardCheck,
  Compass,
  GraduationCap,
  MessageCircle,
  Plus,
  UserCheck,
  X,
} from 'lucide-react';
import {
  ChatMessage,
  ClassroomLesson,
  ExperienceMode,
  GraduationMap,
  LearningTier,
  OpportunityItem,
  PortfolioArtifact,
  RegistrarEntry,
  SavedOpportunity,
  StudentMemory,
  StudentProfile,
  TrackName,
} from '@/lib/types';
import {
  INITIAL_MEMORIES,
  INITIAL_PORTFOLIO_ARTIFACTS,
  INITIAL_REGISTRAR_ENTRIES,
  INITIAL_STUDENTS,
} from '@/lib/initial-data';
import { applyLearningToGraduationMap, computeGraduationGaps } from '@/lib/gaps';
import ConciergeView from './ConciergeView';
import ClassroomView from './ClassroomView';
import LibraryView from './LibraryView';
import OpportunitiesView, { OpportunitySearchSnapshot } from './OpportunitiesView';
import RegistrarView from './RegistrarView';
import PortfolioView from './PortfolioView';

type TabKey =
  | 'adeline'
  | 'classroom'
  | 'library'
  | 'opportunities'
  | 'registrar'
  | 'portfolio';

const STORAGE_KEY = 'dear_adeline_workspace_v4';

interface PersistedState {
  students: StudentProfile[];
  activeStudentId: string;
  chatsByStudent: Record<string, ChatMessage[]>;
  memoriesByStudent: Record<string, StudentMemory>;
  lessons: ClassroomLesson[];
  activeLessonId: string | null;
  registrarEntries: RegistrarEntry[];
  portfolioArtifacts: PortfolioArtifact[];
  bookmarks: Record<string, Record<number, number>>;
  savedOpportunities: SavedOpportunity[];
  graduationMapsByStudent: Record<string, GraduationMap>;
  milestoneTargetsByLesson: Record<string, string>;
}

const DEFAULT_MEMORY: StudentMemory = {
  shortTerm: {
    currentSessionTopics: [],
    recentMisconceptions: [],
    activeBookProgress: null,
    lastUpdated: '2026-11-12',
  },
  longTerm: {
    learnedAboutStudent: [],
    masteredConcepts: [],
    recurringPassions: [],
    identifiedGaps: [],
  },
};

const DEFAULT_STATE: PersistedState = {
  students: INITIAL_STUDENTS,
  activeStudentId: INITIAL_STUDENTS[0].id,
  chatsByStudent: {},
  memoriesByStudent: INITIAL_MEMORIES,
  lessons: [],
  activeLessonId: null,
  registrarEntries: INITIAL_REGISTRAR_ENTRIES,
  portfolioArtifacts: INITIAL_PORTFOLIO_ARTIFACTS,
  bookmarks: {},
  savedOpportunities: [],
  graduationMapsByStudent: {},
  milestoneTargetsByLesson: {},
};

export default function AdelineWorkspace() {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('adeline');
  const [opportunityCacheByStudent, setOpportunityCacheByStudent] = useState<
    Record<string, OpportunitySearchSnapshot>
  >({});

  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('11');
  const [newGrade, setNewGrade] = useState('6th Grade');
  const [newInterests, setNewInterests] = useState('');
  const [newFocus, setNewFocus] = useState('');

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        localStorage.removeItem('dear_adeline_workspace_v3');
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedState>;
          setState((prev) => ({
            ...prev,
            ...parsed,
            students: parsed.students?.length ? parsed.students : prev.students,
            memoriesByStudent: parsed.memoriesByStudent ?? prev.memoriesByStudent,
            savedOpportunities: parsed.savedOpportunities ?? prev.savedOpportunities,
            graduationMapsByStudent:
              parsed.graduationMapsByStudent ?? prev.graduationMapsByStudent,
            milestoneTargetsByLesson:
              parsed.milestoneTargetsByLesson ?? prev.milestoneTargetsByLesson,
          }));
        }
      } catch {
        // Ignore storage read errors
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state, hydrated]);

  const activeStudent =
    state.students.find((s) => s.id === state.activeStudentId) ?? state.students[0];

  const activeMemory =
    state.memoriesByStudent[activeStudent.id] ??
    INITIAL_MEMORIES[activeStudent.id] ??
    DEFAULT_MEMORY;

  const graduationGaps = useMemo(
    () => computeGraduationGaps(activeStudent, state.registrarEntries),
    [activeStudent, state.registrarEntries]
  );

  const activeChatMessages = state.chatsByStudent[activeStudent.id] ?? [];
  const studentLessons = state.lessons.filter((l) => l.studentId === activeStudent.id);
  const activeLesson =
    studentLessons.find((l) => l.id === state.activeLessonId) ?? studentLessons[0] ?? null;

  const updateStudentMemory = (
    studentId: string,
    updater: (prev: StudentMemory) => StudentMemory
  ) => {
    setState((prev) => {
      const current =
        prev.memoriesByStudent[studentId] ?? INITIAL_MEMORIES[studentId] ?? DEFAULT_MEMORY;
      return {
        ...prev,
        memoriesByStudent: {
          ...prev.memoriesByStudent,
          [studentId]: updater(current),
        },
      };
    });
  };

  const handleLaunchClassroom = async (params: {
    topic: string;
    track?: TrackName;
    experienceMode?: ExperienceMode;
    sourceContext?: string;
    targetMilestoneId?: string;
  }) => {
    setActiveTab('classroom');
    setIsGeneratingLesson(true);
    setLessonError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    updateStudentMemory(activeStudent.id, (prev) => ({
      ...prev,
      shortTerm: {
        ...prev.shortTerm,
        currentSessionTopics: Array.from(
          new Set([params.topic, ...prev.shortTerm.currentSessionTopics])
        ).slice(0, 6),
        lastUpdated: new Date().toISOString().split('T')[0],
      },
    }));

    try {
      const res = await fetch('/api/adeline/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: params.topic,
          track: params.track,
          experienceMode: params.experienceMode ?? 'investigation',
          student: activeStudent,
          memory: activeMemory,
          graduationGaps,
          sourceContext: params.sourceContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate classroom lesson.');
      }

      setState((prev) => ({
        ...prev,
        lessons: [data, ...prev.lessons],
        activeLessonId: data.id,
        milestoneTargetsByLesson: params.targetMilestoneId
          ? {
              ...prev.milestoneTargetsByLesson,
              [data.id]: params.targetMilestoneId,
            }
          : prev.milestoneTargetsByLesson,
      }));
    } catch (err) {
      setLessonError(
        err instanceof Error ? err.message : 'Unable to open Classroom right now.'
      );
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  const handleAskAdelineFromBook = async (question: string, contextHint: string) => {
    setActiveTab('adeline');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    const currentHistory = state.chatsByStudent[activeStudent.id] ?? [];
    const nextHistory = [...currentHistory, userMsg];

    setState((prev) => ({
      ...prev,
      chatsByStudent: {
        ...prev.chatsByStudent,
        [activeStudent.id]: nextHistory,
      },
    }));

    try {
      const res = await fetch('/api/adeline/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          student: activeStudent,
          memory: activeMemory,
          graduationGaps,
          contextHint,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Adeline could not respond.');

      const adelineMsg: ChatMessage = {
        id: `msg-${Date.now()}-adeline`,
        role: 'adeline',
        content: data.reply,
        timestamp: new Date().toISOString(),
        followUpPrompts: data.followUpPrompts ?? [],
        evidenceDistinction:
          data.establishedFacts?.length || data.openQuestions?.length
            ? {
                established: data.establishedFacts ?? [],
                openQuestions: data.openQuestions ?? [],
              }
            : undefined,
        suggestedClassroom:
          data.shouldOfferClassroom && data.classroomSuggestion
            ? {
                topic: data.classroomSuggestion.topic,
                track: data.classroomSuggestion.track,
                experienceMode: data.classroomSuggestion.experienceMode,
                drivingQuestion: data.classroomSuggestion.drivingQuestion,
              }
            : undefined,
      };

      setState((prev) => ({
        ...prev,
        chatsByStudent: {
          ...prev.chatsByStudent,
          [activeStudent.id]: [...nextHistory, adelineMsg],
        },
      }));
    } catch {
      // User can retry inside ConciergeView
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const numericAge = Math.max(5, Math.min(19, parseInt(newAge, 10) || 11));
    const tier: LearningTier =
      numericAge <= 8 ? 'Sprout' : numericAge <= 12 ? 'Scout' : 'Sovereign';

    const created: StudentProfile = {
      id: `student-${Date.now()}`,
      name: newName.trim(),
      age: numericAge,
      gradeLabel: `${newGrade.trim() || `${numericAge - 5}th Grade`} · ${tier}`,
      tier,
      interests: newInterests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5),
      currentFocus:
        newFocus.trim() || 'Clean slate — ready to explore, assess knowledge, and discover interests',
      pace: 'Steady',
      targetGraduationYear: new Date().getFullYear() + Math.max(1, 18 - numericAge),
    };

    const initialLearned: string[] = [];
    if (created.interests.length > 0) {
      initialLearned.push(
        `${created.name} (${created.age}) enjoys ${created.interests.join(', ')}.`
      );
    }

    setState((prev) => ({
      ...prev,
      students: [...prev.students, created],
      activeStudentId: created.id,
      memoriesByStudent: {
        ...prev.memoriesByStudent,
        [created.id]: {
          shortTerm: {
            currentSessionTopics: [],
            recentMisconceptions: [],
            activeBookProgress: null,
            lastUpdated: '',
          },
          longTerm: {
            learnedAboutStudent: initialLearned,
            masteredConcepts: [],
            recurringPassions: created.interests,
            identifiedGaps: [],
          },
        },
      },
    }));

    setNewName('');
    setNewInterests('');
    setNewFocus('');
    setShowStudentModal(false);
  };

  const handleSaveOpportunity = (opp: OpportunityItem) => {
    const saved: SavedOpportunity = {
      ...opp,
      studentId: activeStudent.id,
      status: 'Exploring',
      savedAt: new Date().toISOString().split('T')[0],
    };
    setState((prev) => {
      const exists = prev.savedOpportunities.some(
        (s) =>
          s.studentId === activeStudent.id &&
          s.title.toLowerCase() === opp.title.toLowerCase() &&
          s.organizer.toLowerCase() === opp.organizer.toLowerCase()
      );
      if (exists) return prev;
      return {
        ...prev,
        savedOpportunities: [saved, ...prev.savedOpportunities],
      };
    });
  };

  const NAV_ITEMS: {
    key: TabKey;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: 'adeline', label: 'Adeline', mobileLabel: 'Adeline', icon: MessageCircle },
    { key: 'classroom', label: 'Classroom', mobileLabel: 'Class', icon: GraduationCap },
    { key: 'library', label: 'Library', mobileLabel: 'Library', icon: BookOpen },
    { key: 'opportunities', label: 'Opportunities', mobileLabel: 'Scout', icon: Compass },
    { key: 'registrar', label: 'Registrar', mobileLabel: 'Credits', icon: ClipboardCheck },
    { key: 'portfolio', label: 'Portfolio', mobileLabel: 'Work', icon: Award },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fffdf9] text-[#303734]">
      {/* Desktop Top Bar — Strictly 3-Zone Contract with dearadeline.co graphic & Emilys Candy */}
      <header className="hidden md:flex sticky top-0 z-30 bg-[#fbf5ea]/95 backdrop-blur-md border-b border-[#e9ece5] no-print">
        <div className="max-w-7xl w-full mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('adeline')}
            className="inline-flex items-center gap-2.5 font-display text-2xl text-[#294c35] whitespace-nowrap shrink-0 text-left"
          >
            <img
              src="/adeline-nav.png"
              alt="Dear Adeline emblem"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-contain shrink-0"
            />
            <span>Dear Adeline</span>
          </button>

          <nav className="flex items-center gap-5 lg:gap-7">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`py-2 text-sm font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'border-[#7c9a61] text-[#294c35]'
                      : 'border-transparent text-[#68726c] hover:text-[#294c35]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setShowStudentModal(true)}
            className="min-h-[42px] px-4 py-2 rounded-full border border-[#dce7d5] bg-[#fffdf9] hover:bg-[#f7f8f4] text-xs font-extrabold text-[#294c35] inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-[#7c9a61]" />
            <span>
              {activeStudent.name} · Age {activeStudent.age}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Compact Sticky Header (48px) */}
      <header className="md:hidden sticky top-0 z-30 h-12 bg-[#fbf5ea]/95 backdrop-blur-md border-b border-[#e9ece5] px-4 flex items-center justify-between gap-4 no-print">
        <button
          type="button"
          onClick={() => setActiveTab('adeline')}
          className="inline-flex items-center gap-2 font-display text-xl text-[#294c35] whitespace-nowrap shrink-0"
        >
          <img
            src="/adeline-nav.png"
            alt="Dear Adeline emblem"
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded object-contain shrink-0"
          />
          <span>Dear Adeline</span>
        </button>

        <button
          type="button"
          onClick={() => setShowStudentModal(true)}
          className="min-h-[36px] px-3 py-1 rounded-full border border-[#dce7d5] bg-[#fffdf9] text-xs font-extrabold text-[#294c35] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <UserCheck className="w-3.5 h-3.5 text-[#7c9a61]" />
          <span>
            {activeStudent.name} ({activeStudent.age})
          </span>
        </button>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12">
        {activeTab === 'adeline' && (
          <ConciergeView
            student={activeStudent}
            memory={activeMemory}
            graduationGaps={graduationGaps}
            messages={activeChatMessages}
            onUpdateMessages={(msgs) =>
              setState((prev) => ({
                ...prev,
                chatsByStudent: {
                  ...prev.chatsByStudent,
                  [activeStudent.id]: msgs,
                },
              }))
            }
            onUpdateMemory={(updater) => updateStudentMemory(activeStudent.id, updater)}
            onLaunchClassroom={handleLaunchClassroom}
          />
        )}

        {activeTab === 'classroom' && (
          <ClassroomView
            student={activeStudent}
            activeLesson={activeLesson}
            savedLessons={studentLessons}
            isGenerating={isGeneratingLesson}
            generationError={lessonError}
            onGenerateLesson={handleLaunchClassroom}
            onSelectLesson={(lesson) =>
              setState((prev) => ({ ...prev, activeLessonId: lesson.id }))
            }
            onCompleteLesson={({ lesson, registrarEntry, portfolioArtifact, memoryConsolidation }) => {
              setState((prev) => {
                const curMem =
                  prev.memoriesByStudent[activeStudent.id] ??
                  INITIAL_MEMORIES[activeStudent.id] ??
                  DEFAULT_MEMORY;

                const nextMem: StudentMemory = {
                  shortTerm: {
                    ...curMem.shortTerm,
                    recentMisconceptions: memoryConsolidation?.remainingGap
                      ? Array.from(
                          new Set([
                            memoryConsolidation.remainingGap,
                            ...curMem.shortTerm.recentMisconceptions,
                          ])
                        ).slice(0, 5)
                      : curMem.shortTerm.recentMisconceptions,
                    lastUpdated: new Date().toISOString().split('T')[0],
                  },
                  longTerm: {
                    ...curMem.longTerm,
                    masteredConcepts: memoryConsolidation?.masteredConcept
                      ? Array.from(
                          new Set([
                            memoryConsolidation.masteredConcept,
                            ...curMem.longTerm.masteredConcepts,
                          ])
                        ).slice(0, 15)
                      : curMem.longTerm.masteredConcepts,
                    learnedAboutStudent: memoryConsolidation?.newLongTermInsight
                      ? Array.from(
                          new Set([
                            memoryConsolidation.newLongTermInsight,
                            ...curMem.longTerm.learnedAboutStudent,
                          ])
                        ).slice(0, 15)
                      : curMem.longTerm.learnedAboutStudent,
                  },
                };

                const targetMilestoneId = prev.milestoneTargetsByLesson[lesson.id];
                const updatedMap = applyLearningToGraduationMap(
                  prev.graduationMapsByStudent[activeStudent.id],
                  registrarEntry,
                  targetMilestoneId
                );

                return {
                  ...prev,
                  lessons: prev.lessons.map((l) => (l.id === lesson.id ? lesson : l)),
                  registrarEntries: [registrarEntry, ...prev.registrarEntries],
                  portfolioArtifacts: [portfolioArtifact, ...prev.portfolioArtifacts],
                  memoriesByStudent: {
                    ...prev.memoriesByStudent,
                    [activeStudent.id]: nextMem,
                  },
                  graduationMapsByStudent: updatedMap
                    ? {
                        ...prev.graduationMapsByStudent,
                        [activeStudent.id]: updatedMap,
                      }
                    : prev.graduationMapsByStudent,
                };
              });
            }}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            student={activeStudent}
            bookmarks={state.bookmarks[activeStudent.id] ?? {}}
            onUpdateBookmark={(bookId, chapterIndex, bookTitle) => {
              setState((prev) => ({
                ...prev,
                bookmarks: {
                  ...prev.bookmarks,
                  [activeStudent.id]: {
                    ...(prev.bookmarks[activeStudent.id] ?? {}),
                    [bookId]: chapterIndex,
                  },
                },
              }));
              if (bookTitle) {
                updateStudentMemory(activeStudent.id, (prev) => ({
                  ...prev,
                  shortTerm: {
                    ...prev.shortTerm,
                    activeBookProgress: `${bookTitle} (Chapter ${chapterIndex + 1})`,
                    lastUpdated: new Date().toISOString().split('T')[0],
                  },
                }));
              }
            }}
            onLogReading={(entry) =>
              setState((prev) => {
                const updatedMap = applyLearningToGraduationMap(
                  prev.graduationMapsByStudent[activeStudent.id],
                  entry
                );
                return {
                  ...prev,
                  registrarEntries: [entry, ...prev.registrarEntries],
                  graduationMapsByStudent: updatedMap
                    ? {
                        ...prev.graduationMapsByStudent,
                        [activeStudent.id]: updatedMap,
                      }
                    : prev.graduationMapsByStudent,
                };
              })
            }
            onLaunchClassroomFromBook={(params) =>
              handleLaunchClassroom({
                topic: params.topic,
                track: params.track,
                experienceMode: 'investigation',
                sourceContext: params.sourceContext,
              })
            }
            onAskAdelineFromBook={handleAskAdelineFromBook}
          />
        )}

        {activeTab === 'opportunities' && (
          <OpportunitiesView
            key={activeStudent.id}
            student={activeStudent}
            memory={activeMemory}
            savedOpportunities={state.savedOpportunities}
            cachedSnapshot={opportunityCacheByStudent[activeStudent.id]}
            onCacheSnapshot={(snapshot) =>
              setOpportunityCacheByStudent((prev) => ({
                ...prev,
                [snapshot.studentId]: snapshot,
              }))
            }
            onSaveOpportunity={handleSaveOpportunity}
            onUpdateStatus={(id, status) =>
              setState((prev) => ({
                ...prev,
                savedOpportunities: prev.savedOpportunities.map((s) =>
                  s.id === id ? { ...s, status } : s
                ),
              }))
            }
            onDeleteSaved={(id) =>
              setState((prev) => ({
                ...prev,
                savedOpportunities: prev.savedOpportunities.filter((s) => s.id !== id),
              }))
            }
            onPrepareInClassroom={(params) => handleLaunchClassroom(params)}
            onLogCompletedToRegistrar={(entry, opportunityTitle) => {
              setState((prev) => {
                const updatedMap = applyLearningToGraduationMap(
                  prev.graduationMapsByStudent[activeStudent.id],
                  entry
                );
                return {
                  ...prev,
                  registrarEntries: [entry, ...prev.registrarEntries],
                  graduationMapsByStudent: updatedMap
                    ? {
                        ...prev.graduationMapsByStudent,
                        [activeStudent.id]: updatedMap,
                      }
                    : prev.graduationMapsByStudent,
                };
              });
              updateStudentMemory(activeStudent.id, (prev) => ({
                ...prev,
                longTerm: {
                  ...prev.longTerm,
                  learnedAboutStudent: Array.from(
                    new Set([
                      `${activeStudent.name} participated in ${opportunityTitle}.`,
                      ...prev.longTerm.learnedAboutStudent,
                    ])
                  ).slice(0, 15),
                },
              }));
            }}
          />
        )}

        {activeTab === 'registrar' && (
          <RegistrarView
            student={activeStudent}
            memory={activeMemory}
            entries={state.registrarEntries}
            graduationGaps={graduationGaps}
            graduationMap={state.graduationMapsByStudent[activeStudent.id]}
            onSaveGraduationMap={(map, memoryUpdates) => {
              setState((prev) => ({
                ...prev,
                graduationMapsByStudent: {
                  ...prev.graduationMapsByStudent,
                  [activeStudent.id]: map,
                },
              }));
              if (memoryUpdates) {
                updateStudentMemory(activeStudent.id, (prev) => ({
                  ...prev,
                  longTerm: {
                    ...prev.longTerm,
                    learnedAboutStudent: memoryUpdates.newLongTermInsight?.trim()
                      ? Array.from(
                          new Set([
                            memoryUpdates.newLongTermInsight.trim(),
                            ...prev.longTerm.learnedAboutStudent,
                          ])
                        ).slice(0, 15)
                      : prev.longTerm.learnedAboutStudent,
                    masteredConcepts: memoryUpdates.masteredConcept?.trim()
                      ? Array.from(
                          new Set([
                            memoryUpdates.masteredConcept.trim(),
                            ...prev.longTerm.masteredConcepts,
                          ])
                        ).slice(0, 15)
                      : prev.longTerm.masteredConcepts,
                    identifiedGaps: memoryUpdates.identifiedGap?.trim()
                      ? Array.from(
                          new Set([
                            memoryUpdates.identifiedGap.trim(),
                            ...prev.longTerm.identifiedGaps,
                          ])
                        ).slice(0, 8)
                      : prev.longTerm.identifiedGaps,
                  },
                }));
              }
            }}
            onToggleMilestoneStatus={(milestoneId) => {
              setState((prev) => {
                const map = prev.graduationMapsByStudent[activeStudent.id];
                if (!map) return prev;
                const today = new Date().toISOString().split('T')[0];
                return {
                  ...prev,
                  graduationMapsByStudent: {
                    ...prev.graduationMapsByStudent,
                    [activeStudent.id]: {
                      ...map,
                      milestones: map.milestones.map((m) => {
                        if (m.id !== milestoneId) return m;
                        const nextStatus =
                          m.status === 'mastered' ? ('upcoming' as const) : ('mastered' as const);
                        return {
                          ...m,
                          status: nextStatus,
                          completedDate: nextStatus === 'mastered' ? today : undefined,
                          linkedEntryTitle:
                            nextStatus === 'mastered'
                              ? m.linkedEntryTitle || 'Verified by Parent / Student'
                              : undefined,
                        };
                      }),
                    },
                  },
                };
              });
            }}
            onAddEntry={(entry) =>
              setState((prev) => {
                const updatedMap = applyLearningToGraduationMap(
                  prev.graduationMapsByStudent[activeStudent.id],
                  entry
                );
                return {
                  ...prev,
                  registrarEntries: [entry, ...prev.registrarEntries],
                  graduationMapsByStudent: updatedMap
                    ? {
                        ...prev.graduationMapsByStudent,
                        [activeStudent.id]: updatedMap,
                      }
                    : prev.graduationMapsByStudent,
                };
              })
            }
            onBridgeGap={(topic, track) =>
              handleLaunchClassroom({
                topic,
                track,
                experienceMode: 'investigation',
              })
            }
            onLaunchMilestoneClassroom={({ topic, track, milestoneId, sourceContext }) =>
              handleLaunchClassroom({
                topic,
                track,
                experienceMode: 'investigation',
                sourceContext,
                targetMilestoneId: milestoneId,
              })
            }
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView
            student={activeStudent}
            artifacts={state.portfolioArtifacts}
          />
        )}
      </main>

      {/* Mobile Bottom Thumb-Zone Navigation Bar (56px height) */}
      <nav
        aria-label="Primary Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fbf5ea]/95 backdrop-blur-md border-t border-[#e9ece5] pb-safe no-print"
      >
        <div className="grid grid-cols-6 h-14 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveTab(item.key);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-[#294c35]' : 'text-[#68726c]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-tight leading-none">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Learner Switcher & Add Child Sheet */}
      {showStudentModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowStudentModal(false)}
        >
          <div
            className="bg-[#fffdf9] w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border-2 border-[#294c35] p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-[#294c35]">Family Learners</h2>
                <p className="text-xs text-[#68726c]">
                  Each student has their own Short-Term & Long-Term Memory, Classroom, and Registrar.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close learner switcher"
                onClick={() => setShowStudentModal(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-[#e9ece5] flex items-center justify-center text-[#68726c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {state.students.map((s) => {
                const selected = s.id === activeStudent.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setState((prev) => ({ ...prev, activeStudentId: s.id }));
                      setShowStudentModal(false);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${
                      selected
                        ? 'border-[#294c35] bg-[#f7f8f4]'
                        : 'border-[#e9ece5] bg-white hover:bg-[#fbf5ea]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-display text-xl text-[#294c35]">
                        {s.name} · Age {s.age}
                      </p>
                      <p className="text-xs text-[#68726c] truncate">
                        {s.gradeLabel}
                        {s.interests.length > 0 ? ` · ${s.interests.slice(0, 2).join(', ')}` : ''}
                      </p>
                    </div>
                    {selected && (
                      <span className="text-xs font-extrabold text-[#7c9a61] shrink-0">Active</span>
                    )}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleAddStudent}
              className="pt-4 border-t border-[#e9ece5] space-y-3"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#294c35]">
                <Plus className="w-4 h-4 text-[#7c9a61]" />
                <span>Add Another Student</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="First Name"
                  className="col-span-2 min-h-[44px] px-3 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-sm"
                />
                <input
                  type="number"
                  min="5"
                  max="19"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  placeholder="Age"
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-sm font-mono tabular-nums"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  placeholder="Grade (e.g., 6th Grade)"
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-sm"
                />
                <input
                  type="text"
                  value={newInterests}
                  onChange={(e) => setNewInterests(e.target.value)}
                  placeholder="Interests (comma-separated)"
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-sm"
                />
              </div>
              <input
                type="text"
                value={newFocus}
                onChange={(e) => setNewFocus(e.target.value)}
                placeholder="Current learning focus (optional)"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-sm"
              />
              <button
                type="submit"
                className="w-full min-h-[46px] rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold transition-colors"
              >
                Create Student Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

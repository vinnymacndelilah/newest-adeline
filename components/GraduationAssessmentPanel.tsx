'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Compass,
  GraduationCap,
  Loader2,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  AssessmentAnswerSubmission,
  AssessmentQuestion,
  AssessmentScope,
  CreditCategory,
  GraduationGapItem,
  GraduationMap,
  GraduationMilestone,
  RegistrarEntry,
  StudentMemory,
  StudentProfile,
  TrackName,
} from '@/lib/types';
import { GRADUATION_REQUIREMENTS } from '@/lib/initial-data';

interface GraduationAssessmentPanelProps {
  student: StudentProfile;
  memory: StudentMemory;
  entries: RegistrarEntry[];
  graduationGaps: GraduationGapItem[];
  graduationMap?: GraduationMap;
  onSaveGraduationMap: (
    map: GraduationMap,
    memoryUpdates?: {
      newLongTermInsight?: string;
      masteredConcept?: string;
      identifiedGap?: string;
    } | null
  ) => void;
  onToggleMilestoneStatus: (milestoneId: string) => void;
  onLaunchMilestoneClassroom: (params: {
    topic: string;
    track: TrackName;
    milestoneId: string;
    sourceContext: string;
  }) => void;
}

const SCOPES: AssessmentScope[] = [
  'All Domains',
  ...GRADUATION_REQUIREMENTS.map((r) => r.category as CreditCategory),
];

const PHASES: GraduationMilestone['phase'][] = [
  'Foundations',
  'Core Mastery',
  'Capstone & Launch',
];

export default function GraduationAssessmentPanel({
  student,
  memory,
  entries,
  graduationGaps,
  graduationMap,
  onSaveGraduationMap,
  onToggleMilestoneStatus,
  onLaunchMilestoneClassroom,
}: GraduationAssessmentPanelProps) {
  const [selectedScope, setSelectedScope] = useState<AssessmentScope>('All Domains');
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, { selectedIndex: number; note: string }>>(
    {}
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mode, setMode] = useState<'idle' | 'taking' | 'submitting'>('idle');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastCompletedQuestions, setLastCompletedQuestions] = useState<AssessmentQuestion[]>([]);
  const [lastSubmissions, setLastSubmissions] = useState<AssessmentAnswerSubmission[]>([]);
  const [showReview, setShowReview] = useState(false);

  const startAssessment = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/adeline/assessment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student,
          memory,
          registrarEntries: entries,
          graduationGaps,
          scope: selectedScope,
        }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data.error || 'Could not generate assessment questions.');
      }
      setQuestions(data.questions);
      setAnswers({});
      setCurrentIdx(0);
      setMode('taking');
      setShowReview(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to start knowledge assessment right now.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const submitAssessment = async () => {
    setMode('submitting');
    setError(null);

    const submissions: AssessmentAnswerSubmission[] = questions.map((q) => ({
      questionId: q.id,
      selectedIndex: answers[q.id]?.selectedIndex ?? -1,
      reasoningNote: answers[q.id]?.note ?? '',
    }));

    try {
      const res = await fetch('/api/adeline/assessment/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student,
          memory,
          registrarEntries: entries,
          graduationGaps,
          scope: selectedScope,
          questions,
          submissions,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.graduationMap) {
        throw new Error(data.error || 'Could not evaluate assessment.');
      }
      onSaveGraduationMap(data.graduationMap, data.memoryUpdates);
      setLastCompletedQuestions(questions);
      setLastSubmissions(submissions);
      setQuestions([]);
      setMode('idle');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to evaluate assessment right now.'
      );
      setMode('taking');
    }
  };

  const currentQuestion = questions[currentIdx];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = questions.filter((q) => (answers[q.id]?.selectedIndex ?? -1) >= 0).length;

  const masteredCount =
    graduationMap?.milestones.filter((m) => m.status === 'mastered').length ?? 0;
  const totalMilestones = graduationMap?.milestones.length ?? 0;
  const mapPct =
    totalMilestones > 0 ? Math.round((masteredCount / totalMilestones) * 100) : 0;

  return (
    <section className="bg-[#fffdf9] border border-[#e9ece5] rounded-[28px] p-5 sm:p-7 space-y-6 shadow-[0_8px_22px_rgba(44,57,48,0.05)] no-print">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[#e9ece5]">
        <div className="space-y-1.5 max-w-3xl">
          <span className="font-hand text-lg text-[#d78472]">
            Diagnostic &amp; Living Graduation Map
          </span>
          <h2 className="font-display text-2xl sm:text-3xl text-[#294c35]">
            {student.name}’s Knowledge Assessment &amp; Personalized Roadmap
          </h2>
          <p className="text-xs sm:text-sm text-[#68726c] leading-relaxed">
            Test {student.name}’s reasoning across core subjects to build a personalized roadmap to{' '}
            {student.targetGraduationYear} graduation. Milestones automatically fill in as{' '}
            {student.name} completes Classroom lessons, reads books, and logs real-world work.
          </p>
        </div>

        {mode === 'idle' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <select
              aria-label="Choose assessment domain scope"
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as AssessmentScope)}
              disabled={isGenerating}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/75 text-xs font-bold text-[#294c35]"
            >
              {SCOPES.map((sc) => (
                <option key={sc} value={sc}>
                  {sc === 'All Domains' ? 'Full 7-Domain Diagnostic' : `${sc} Focus Check`}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={startAssessment}
              disabled={isGenerating}
              className="min-h-[44px] px-5 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] disabled:opacity-60 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Questions...</span>
                </>
              ) : (
                <>
                  {graduationMap ? (
                    <RotateCcw className="w-4 h-4" />
                  ) : (
                    <Compass className="w-4 h-4" />
                  )}
                  <span>
                    {graduationMap ? 'Retake / Update Assessment' : 'Start Knowledge Assessment'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Active Assessment Runner */}
      {mode !== 'idle' && currentQuestion && (
        <div className="bg-[#fbf5ea] border border-[#dce7d5] rounded-[24px] p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-hand text-base text-[#d78472]">
                {currentQuestion.creditCategory} · {currentQuestion.capabilityTested}
              </span>
              <p className="text-xs font-mono tabular-nums text-[#68726c]">
                Question {currentIdx + 1} of {questions.length} · {answeredCount} answered
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('idle');
                setQuestions([]);
              }}
              className="min-h-[36px] px-3 py-1 rounded-full border border-[#dce7d5] bg-white text-xs font-bold text-[#68726c]"
            >
              Cancel Assessment
            </button>
          </div>

          <div className="h-2 rounded-full bg-white border border-[#e9ece5] overflow-hidden">
            <div
              className="h-full bg-[#7c9a61] transition-all"
              style={{ width: `${Math.round(((currentIdx + 1) / questions.length) * 100)}%` }}
            />
          </div>

          {currentQuestion.scenarioContext && (
            <div className="p-4 rounded-2xl bg-white border border-[#e9ece5] text-xs sm:text-sm text-[#68726c] leading-relaxed">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#294c35] mb-1">
                Context &amp; Evidence
              </span>
              {currentQuestion.scenarioContext}
            </div>
          )}

          <h3 className="font-display text-xl sm:text-2xl text-[#294c35] leading-snug">
            {currentQuestion.prompt}
          </h3>

          <div className="space-y-2.5">
            {currentQuestion.options.map((opt, idx) => {
              const selected = currentAnswer?.selectedIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={mode === 'submitting'}
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: {
                        selectedIndex: idx,
                        note: prev[currentQuestion.id]?.note ?? '',
                      },
                    }))
                  }
                  className={`w-full text-left p-4 rounded-2xl border transition-colors flex items-start gap-3 min-h-[52px] ${
                    selected
                      ? 'border-[#294c35] bg-[#f7f8f4] shadow-sm'
                      : 'border-[#e9ece5] bg-white hover:border-[#7c9a61]'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-mono shrink-0 ${
                      selected
                        ? 'bg-[#294c35] border-[#294c35] text-white'
                        : 'border-[#dce7d5] text-[#68726c]'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm text-[#303734] leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="assessment-reasoning-note"
              className="block text-xs font-bold text-[#294c35]"
            >
              Explain your thinking in your own words (optional — helps Adeline tailor your map)
            </label>
            <textarea
              id="assessment-reasoning-note"
              rows={2}
              disabled={mode === 'submitting'}
              value={currentAnswer?.note ?? ''}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion.id]: {
                    selectedIndex: prev[currentQuestion.id]?.selectedIndex ?? -1,
                    note: e.target.value,
                  },
                }))
              }
              placeholder={`Why did you choose that answer, ${student.name}?`}
              className="w-full rounded-2xl border border-[#dce7d5] bg-white px-4 py-2.5 text-sm text-[#303734]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={currentIdx === 0 || mode === 'submitting'}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="min-h-[44px] px-4 py-2 rounded-full border border-[#dce7d5] bg-white disabled:opacity-40 text-xs font-bold text-[#294c35] inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                className="min-h-[44px] px-5 py-2 rounded-full bg-[#294c35] hover:bg-[#7c9a61] text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={mode === 'submitting' || answeredCount === 0}
                onClick={submitAssessment}
                className="min-h-[44px] px-5 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-2 transition-colors"
              >
                {mode === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Building {student.name}’s Graduation Map...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Evaluate &amp; Build Graduation Map</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State before first Assessment */}
      {mode === 'idle' && !graduationMap && (
        <div className="bg-[#fbf5ea]/75 border border-dashed border-[#dce7d5] rounded-[24px] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-[#294c35]">
              <MapIcon className="w-4 h-4 text-[#7c9a61]" />
              <span>No Personalized Graduation Map Generated Yet for {student.name}</span>
            </div>
            <p className="text-xs sm:text-sm text-[#68726c] leading-relaxed">
              Have {student.name} take a quick 7-domain reasoning assessment (or pick one focused
              subject above). Adeline will combine their answers with existing Registrar credits to
              chart a living milestone map toward {student.targetGraduationYear} graduation.
            </p>
          </div>
          <button
            type="button"
            onClick={startAssessment}
            disabled={isGenerating}
            className="min-h-[46px] px-5 py-2.5 rounded-full bg-[#294c35] hover:bg-[#7c9a61] text-white text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Take Diagnostic Assessment</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Personalized Graduation Map Display */}
      {mode === 'idle' && graduationMap && (
        <div className="space-y-6">
          {/* Map Progress & Summary Banner */}
          <div className="p-5 sm:p-6 rounded-[24px] bg-[#fbf5ea] border border-[#dce7d5] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono tabular-nums text-[#68726c]">
                  Assessed {graduationMap.generatedAt} · Scope: {graduationMap.lastAssessedScope}
                </p>
                <h3 className="font-display text-2xl text-[#294c35]">
                  Roadmap Progress: {masteredCount} of {totalMilestones} Milestones Filled In
                </h3>
              </div>
              <span className="font-mono tabular-nums text-2xl font-semibold text-[#7c9a61]">
                {mapPct}%
              </span>
            </div>

            <div className="h-3 rounded-full bg-white border border-[#e9ece5] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#7c9a61] transition-all"
                style={{ width: `${Math.max(masteredCount > 0 ? 5 : 0, mapPct)}%` }}
              />
            </div>

            <p className="text-sm text-[#303734] leading-relaxed">
              {graduationMap.overallReadinessSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-[#e9ece5] space-y-1.5">
                <p className="text-xs font-bold text-[#294c35]">Strengths Observed</p>
                <ul className="space-y-1 text-xs text-[#68726c] leading-relaxed">
                  {graduationMap.strengthsObserved.map((s, idx) => (
                    <li key={idx}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-[#e9ece5] space-y-1.5">
                <p className="text-xs font-bold text-[#d89a3c]">Priority Gaps to Fill</p>
                <ul className="space-y-1 text-xs text-[#68726c] leading-relaxed">
                  {graduationMap.priorityGaps.map((g, idx) => (
                    <li key={idx}>• {g}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Domain Readiness Breakdown */}
          <div className="space-y-3">
            <h3 className="font-display text-xl text-[#294c35]">7-Domain Readiness Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {graduationMap.domainRatings.map((rating) => (
                <div
                  key={rating.category}
                  className="p-3.5 rounded-2xl bg-[#fbf5ea]/55 border border-[#e9ece5] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#294c35] truncate">{rating.category}</span>
                    <span className="font-mono tabular-nums text-[#7c9a61] font-semibold shrink-0">
                      {rating.scorePct}%
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#d78472]">{rating.assessedLevel}</p>
                  <p className="text-xs text-[#68726c] leading-snug">{rating.summaryNote}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3-Phase Living Milestone Roadmap */}
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-display text-2xl text-[#294c35]">
                Living Graduation Milestones
              </h3>
              <p className="text-xs text-[#68726c]">
                Click <span className="font-bold text-[#294c35]">Learn in Classroom</span> on any
                milestone—completing it fills this map automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {PHASES.map((phase) => {
                const phaseItems = graduationMap.milestones.filter((m) => m.phase === phase);
                const phaseDone = phaseItems.filter((m) => m.status === 'mastered').length;
                return (
                  <div
                    key={phase}
                    className="p-4 rounded-[22px] bg-[#fbf5ea]/65 border border-[#e9ece5] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#dce7d5]">
                      <h4 className="font-display text-xl text-[#294c35]">{phase}</h4>
                      <span className="text-xs font-mono tabular-nums text-[#68726c]">
                        {phaseDone}/{phaseItems.length}
                      </span>
                    </div>

                    {phaseItems.length === 0 ? (
                      <p className="text-xs text-[#68726c] py-2">
                        No milestones placed in this phase yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {phaseItems.map((m) => {
                          const isDone = m.status === 'mastered';
                          const isActive = m.status === 'in-progress';
                          return (
                            <div
                              key={m.id}
                              className={`p-3.5 rounded-2xl border space-y-2.5 transition-colors ${
                                isDone
                                  ? 'bg-[#f7f8f4] border-[#7c9a61]/50'
                                  : isActive
                                  ? 'bg-white border-[#d89a3c]/60 shadow-sm'
                                  : 'bg-white border-[#e9ece5]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => onToggleMilestoneStatus(m.id)}
                                  aria-label={`Toggle completion for ${m.title}`}
                                  className="mt-0.5 shrink-0 text-[#7c9a61]"
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-5 h-5 text-[#7c9a61]" />
                                  ) : isActive ? (
                                    <Compass className="w-5 h-5 text-[#d89a3c]" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-[#dce7d5] hover:text-[#7c9a61]" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-bold text-[#d78472]">
                                    {m.creditCategory} · +{m.creditValue.toFixed(2)} cr
                                  </p>
                                  <h5 className="text-sm font-extrabold text-[#294c35] leading-snug">
                                    {m.title}
                                  </h5>
                                </div>
                              </div>

                              <p className="text-xs text-[#68726c] leading-relaxed">
                                {m.description}
                              </p>

                              {isDone ? (
                                <p className="text-[11px] font-bold text-[#294c35] pt-1 border-t border-[#dce7d5]">
                                  Filled in {m.completedDate ? `(${m.completedDate})` : ''}:{' '}
                                  <span className="font-normal text-[#68726c]">
                                    {m.linkedEntryTitle || m.evidenceGoal}
                                  </span>
                                </p>
                              ) : (
                                <div className="space-y-2 pt-1 border-t border-[#e9ece5]">
                                  <p className="text-[11px] text-[#68726c]">
                                    <span className="font-bold text-[#294c35]">Evidence Goal:</span>{' '}
                                    {m.evidenceGoal}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onLaunchMilestoneClassroom({
                                        topic: m.classroomTopic,
                                        track: m.track,
                                        milestoneId: m.id,
                                        sourceContext: `GRADUATION MAP MILESTONE (${m.phase} · ${m.creditCategory}): ${m.title}. Evidence Goal: ${m.evidenceGoal}.`,
                                      })
                                    }
                                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[#294c35] hover:bg-[#7c9a61] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    <span>Learn in Classroom</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Post-Assessment Question Review Accordion */}
          {lastCompletedQuestions.length > 0 && (
            <div className="border-t border-[#e9ece5] pt-4">
              <button
                type="button"
                onClick={() => setShowReview((v) => !v)}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#294c35]"
              >
                {showReview ? (
                  <ChevronUp className="w-4 h-4 text-[#7c9a61]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#7c9a61]" />
                )}
                <span>
                  Review Latest Assessment Questions &amp; Explanations ({lastCompletedQuestions.length})
                </span>
              </button>

              {showReview && (
                <div className="mt-4 space-y-3">
                  {lastCompletedQuestions.map((q, idx) => {
                    const sub = lastSubmissions.find((s) => s.questionId === q.id);
                    const picked = sub?.selectedIndex ?? -1;
                    const correct = picked === q.correctIndex;
                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl bg-[#fbf5ea]/60 border border-[#e9ece5] space-y-1.5 text-xs"
                      >
                        <p className="font-bold text-[#294c35]">
                          Q{idx + 1} · {q.creditCategory} ({correct ? 'Correct' : 'Growth Area'})
                        </p>
                        <p className="text-[#303734] font-semibold">{q.prompt}</p>
                        <p className="text-[#68726c]">
                          {student.name} answered:{' '}
                          <span className="font-bold">
                            {picked >= 0 ? q.options[picked] : 'No selection'}
                          </span>
                        </p>
                        {!correct && (
                          <p className="text-[#294c35]">
                            Strongest reasoning: <span className="font-bold">{q.options[q.correctIndex]}</span>
                          </p>
                        )}
                        <p className="text-[#68726c] leading-relaxed">{q.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

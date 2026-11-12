'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Loader2,
  MessageSquare,
  Play,
  ShieldCheck,
  Sliders,
  Sparkles,
  Square,
  Users,
  Volume2,
} from 'lucide-react';
import {
  ClassroomLesson,
  ExperienceMode,
  LearningTier,
  PortfolioArtifact,
  RegistrarEntry,
  StudentProfile,
  TrackName,
} from '@/lib/types';

interface ClassroomViewProps {
  student: StudentProfile;
  activeLesson: ClassroomLesson | null;
  savedLessons: ClassroomLesson[];
  isGenerating: boolean;
  generationError: string | null;
  onGenerateLesson: (params: {
    topic: string;
    track?: TrackName;
    experienceMode?: ExperienceMode;
  }) => void;
  onSelectLesson: (lesson: ClassroomLesson) => void;
  onCompleteLesson: (params: {
    lesson: ClassroomLesson;
    registrarEntry: RegistrarEntry;
    portfolioArtifact: PortfolioArtifact;
    memoryConsolidation?: {
      masteredConcept?: string;
      newLongTermInsight?: string;
      remainingGap?: string;
    };
  }) => void;
}

const TRACK_OPTIONS: TrackName[] = [
  "God's Creation & Science",
  'Truth-Based History',
  'Justice & Change-making',
  'Mathematics & Logic',
  'Literature & Rhetoric',
  'Creative Economy & Practical Arts',
  'Discipleship & Stewardship',
];

const MODE_OPTIONS: ExperienceMode[] = [
  'investigation',
  'STEM',
  'STEAM',
  'maker/build',
  'family project',
  'public-interest investigation',
  'civic-action project',
];

export default function ClassroomView({
  student,
  activeLesson,
  savedLessons,
  isGenerating,
  generationError,
  onGenerateLesson,
  onSelectLesson,
  onCompleteLesson,
}: ClassroomViewProps) {
  const [topicInput, setTopicInput] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<TrackName | 'auto'>('auto');
  const [selectedMode, setSelectedMode] = useState<ExperienceMode>('investigation');

  // OpenMAIC Multi-Scene Classroom Player State
  const [classroomTab, setClassroomTab] = useState<
    'lesson' | 'simulation' | 'activity' | 'demonstration'
  >('lesson');
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [whiteboardStepCount, setWhiteboardStepCount] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [simValue, setSimValue] = useState<number | null>(null);

  const [selectedTier, setSelectedTier] = useState<LearningTier>(student.tier);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Inline Socratic Tutor
  const [inlineQuestion, setInlineQuestion] = useState('');
  const [inlineReply, setInlineReply] = useState<string | null>(null);
  const [inlineLoading, setInlineLoading] = useState(false);

  // Demonstration & Submission
  const [demonstrationText, setDemonstrationText] = useState('');
  const [handsOnNotes, setHandsOnNotes] = useState('');
  const [hoursSpent, setHoursSpent] = useState('1.5');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<{
    masteryLevel: 'Emerging' | 'Developing' | 'Demonstrated' | 'Mastery';
    adelineFeedback: string;
    evidenceSummary: string[];
    approvedCredits: number;
    nextCuriosityPrompt: string;
  } | null>(null);

  const [labImgError, setLabImgError] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const toggleSpeakScene = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.98;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;
    stopSpeech();
    setEvalResult(null);
    setAnswers({});
    setCompletedSteps({});
    setClassroomTab('lesson');
    setActiveStageIdx(0);
    setWhiteboardStepCount(1);
    setSimValue(null);
    setSelectedTier(student.tier);
    onGenerateLesson({
      topic: topicInput.trim(),
      track: selectedTrack === 'auto' ? undefined : selectedTrack,
      experienceMode: selectedMode,
    });
  };

  const handleAskInClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineQuestion.trim() || !activeLesson || inlineLoading) return;
    setInlineLoading(true);
    try {
      const res = await fetch('/api/adeline/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inlineQuestion.trim(),
          history: [],
          student,
          contextHint: `The learner paused inside Classroom Scene "${activeLesson.title}" (${activeLesson.track}), Stage: "${activeLesson.stages[activeStageIdx]?.title}".`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not ask Adeline.');
      setInlineReply(data.reply);
      setInlineQuestion('');
    } catch (err) {
      setInlineReply(
        err instanceof Error ? err.message : 'Unable to connect to Adeline right now.'
      );
    } finally {
      setInlineLoading(false);
    }
  };

  const handleSubmitDemonstration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLesson || isEvaluating) return;

    setEvalError(null);
    setIsEvaluating(true);

    const checks = activeLesson.reinforcingActivity?.interactiveChecks ?? [];
    const checksScore = checks.reduce((acc, ck) => {
      return acc + (answers[ck.id] === ck.correctIndex ? 1 : 0);
    }, 0);

    const numericHours = Math.max(0.25, parseFloat(hoursSpent) || 1.0);

    try {
      const res = await fetch('/api/adeline/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson: activeLesson,
          student,
          demonstrationText,
          handsOnNotes,
          checksScore,
          checksTotal: checks.length,
          hoursSpent: numericHours,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Evaluation could not be completed.');
      }

      setEvalResult(data);

      const today = new Date().toISOString().split('T')[0];
      const registrarEntry: RegistrarEntry = {
        id: `reg-${Date.now()}`,
        studentId: student.id,
        date: today,
        title: activeLesson.title,
        track: activeLesson.track,
        creditCategory: activeLesson.creditRecommendation.subjectCategory,
        hours: numericHours,
        creditsEarned: data.approvedCredits,
        masteryLevel: data.masteryLevel,
        witnessVerified: activeLesson.witnessProtocol.governed,
        sourceType: 'classroom',
        notes: handsOnNotes || activeLesson.drivingQuestion,
      };

      const portfolioArtifact: PortfolioArtifact = {
        id: `port-${Date.now()}`,
        studentId: student.id,
        createdAt: today,
        title: activeLesson.title,
        track: activeLesson.track,
        creditCategory: activeLesson.creditRecommendation.subjectCategory,
        drivingQuestion: activeLesson.drivingQuestion,
        studentDemonstration: demonstrationText,
        handsOnNotes,
        evidenceSummary: data.evidenceSummary ?? [],
        adelineFeedback: data.adelineFeedback,
        masteryLevel: data.masteryLevel,
        creditsAwarded: data.approvedCredits,
        hoursLogged: numericHours,
      };

      onCompleteLesson({
        lesson: { ...activeLesson, status: 'completed' },
        registrarEntry,
        portfolioArtifact,
        memoryConsolidation: data.memoryConsolidation,
      });
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Submission error.');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="bg-[#fbf5ea] border border-[#e9ece5] rounded-[28px] p-8 sm:p-12 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#7c9a61] mx-auto" />
        <p className="font-hand text-xl text-[#d78472]">Preparing Classroom Scenes</p>
        <h2 className="font-display text-3xl text-[#294c35]">
          Building {student.name}’s Interactive Classroom
        </h2>
        <p className="text-sm text-[#68726c] max-w-md mx-auto leading-relaxed">
          Adeline is assembling slide anchors, whiteboard derivations, classmate roundtable prompts,
          an interactive lab simulator, and a hands-on Sovereign Lab mission.
        </p>
      </div>
    );
  }

  const activeStage = activeLesson?.stages[activeStageIdx];
  const sim = activeLesson?.interactiveSimulation;
  const activeSimVal = sim
    ? simValue ?? sim.defaultValue
    : 0;
  const simOutput = sim
    ? Number((activeSimVal * sim.multiplier + sim.baselineOffset).toFixed(2))
    : 0;
  const simPercent = sim
    ? Math.max(0, Math.min(100, ((activeSimVal - sim.min) / Math.max(0.001, sim.max - sim.min)) * 100))
    : 0;

  return (
    <div className="space-y-8">
      {/* Classroom Launcher Bar */}
      <section className="bg-[#fbf5ea] border border-[#e9ece5] rounded-[28px] p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <p className="font-hand text-lg text-[#d78472]">
                OpenMAIC Interactive Classroom · {student.name}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl text-[#294c35]">
                Build a Multi-Scene Lesson & Lab
              </h1>
              <p className="text-sm text-[#68726c]">
                Enter any subject or question. Adeline opens an interactive whiteboard classroom with
                classmate dialogue, live parameter simulation, and a reinforcing hands-on mission.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="classroom-topic" className="sr-only">
                  Lesson Topic or Driving Question
                </label>
                <input
                  id="classroom-topic"
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g., How yeast fermentation works, The Constitutional Convention, or Lumber ratio geometry..."
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl border border-[#dce7d5] bg-[#fffdf9] text-sm text-[#303734] placeholder:text-[#68726c]/70 focus:outline-none focus:ring-2 focus:ring-[#7c9a61]/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  aria-label="Academic Track"
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value as TrackName | 'auto')}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-[#dce7d5] bg-[#fffdf9] text-xs font-bold text-[#303734]"
                >
                  <option value="auto">Track: Auto-Detect</option>
                  {TRACK_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Experience Mode"
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value as ExperienceMode)}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-[#dce7d5] bg-[#fffdf9] text-xs font-bold text-[#303734]"
                >
                  {MODE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      Mode: {m}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={!topicInput.trim()}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Open Classroom</span>
                </button>
              </div>
            </form>

            {generationError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {generationError}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 relative min-h-[180px] rounded-2xl overflow-hidden bg-[#f7f8f4] border border-[#e9ece5]">
            {!labImgError ? (
              <img
                src="/images/sovereign_lab_banner_1794514268920.jpg"
                alt="Home science investigation table with glass beakers, magnifying loupe, copper coils, and botanical specimens"
                referrerPolicy="no-referrer"
                onError={() => setLabImgError(true)}
                className="w-full h-full object-cover lg:absolute lg:inset-0"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <FlaskConical className="w-7 h-7 text-[#294c35] mb-2" />
                <p className="font-display text-lg text-[#294c35]">Sovereign Lab Bench</p>
              </div>
            )}
          </div>
        </div>

        {savedLessons.length > 0 && (
          <div className="pt-4 border-t border-[#dce7d5] flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#68726c] mr-1">Recent Classrooms:</span>
            {savedLessons.slice(0, 4).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  stopSpeech();
                  onSelectLesson(l);
                  setEvalResult(null);
                  setClassroomTab('lesson');
                  setActiveStageIdx(0);
                  setWhiteboardStepCount(1);
                  setSimValue(null);
                }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors truncate max-w-[240px] ${
                  activeLesson?.id === l.id
                    ? 'bg-[#294c35] text-white border-[#294c35]'
                    : 'bg-[#fffdf9] text-[#303734] border-[#dce7d5] hover:bg-[#f7f8f4]'
                }`}
              >
                {l.title}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Active OpenMAIC Classroom Player */}
      {activeLesson && (
        <section className="space-y-6">
          {/* Classroom Title & Scene Tabs */}
          <div className="bg-[#fffdf9] border-2 border-[#294c35] rounded-[28px] p-5 sm:p-6 space-y-5 shadow-[8px_10px_#dce7d5]">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#68726c]">
                  <span className="font-hand text-base text-[#d78472]">{activeLesson.track}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize font-bold text-[#294c35]">
                    {activeLesson.experienceMode}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {activeLesson.creditRecommendation.estimatedHours}h ·{' '}
                    {activeLesson.creditRecommendation.suggestedCredits} cr
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-[#294c35]">
                  {activeLesson.title}
                </h2>
                <p className="text-sm font-bold text-[#303734]">
                  Driving Question: {activeLesson.drivingQuestion}
                </p>
              </div>

              {activeLesson.witnessProtocol.governed && (
                <div className="p-3.5 rounded-2xl bg-[#fbf5ea] border border-[#dce7d5] shrink-0 space-y-1 min-w-[230px]">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#294c35]">
                    <ShieldCheck className="w-4 h-4 text-[#7c9a61]" />
                    <span>Witness Protocol Active</span>
                  </div>
                  <p className="text-xs font-mono tabular-nums text-[#68726c]">
                    Confidence: {activeLesson.witnessProtocol.achievedConfidence.toFixed(2)} / Threshold{' '}
                    {activeLesson.witnessProtocol.threshold?.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* 4-Scene Classroom Player Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-[#f7f8f4] border border-[#e9ece5] rounded-2xl">
              <button
                type="button"
                onClick={() => setClassroomTab('lesson')}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  classroomTab === 'lesson'
                    ? 'bg-[#294c35] text-white shadow-sm'
                    : 'text-[#68726c] hover:text-[#294c35]'
                }`}
              >
                1. Whiteboard & Scenes
              </button>
              <button
                type="button"
                onClick={() => setClassroomTab('simulation')}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  classroomTab === 'simulation'
                    ? 'bg-[#294c35] text-white shadow-sm'
                    : 'text-[#68726c] hover:text-[#294c35]'
                }`}
              >
                2. Interactive Lab Sim
              </button>
              <button
                type="button"
                onClick={() => setClassroomTab('activity')}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  classroomTab === 'activity'
                    ? 'bg-[#294c35] text-white shadow-sm'
                    : 'text-[#68726c] hover:text-[#294c35]'
                }`}
              >
                3. Quiz & Hands-On
              </button>
              <button
                type="button"
                onClick={() => setClassroomTab('demonstration')}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  classroomTab === 'demonstration'
                    ? 'bg-[#294c35] text-white shadow-sm'
                    : 'text-[#68726c] hover:text-[#294c35]'
                }`}
              >
                4. Mastery & Credit
              </button>
            </div>
          </div>

          {/* SCENE 1: SLIDES + DIGITAL WHITEBOARD + PEER ROUNDTABLE */}
          {classroomTab === 'lesson' && activeStage && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-6">
                {/* Scene Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeLesson.stages.map((stage, idx) => (
                    <button
                      key={stage.id || idx}
                      type="button"
                      onClick={() => {
                        stopSpeech();
                        setActiveStageIdx(idx);
                        setWhiteboardStepCount(1);
                      }}
                      className={`text-left p-3 rounded-2xl border transition-colors min-h-[58px] ${
                        activeStageIdx === idx
                          ? 'border-[#294c35] bg-[#fbf5ea]'
                          : 'border-[#e9ece5] bg-[#fffdf9] hover:bg-[#f7f8f4]'
                      }`}
                    >
                      <span className="block text-[11px] font-bold text-[#d78472]">
                        Scene 0{idx + 1} · {stage.phase}
                      </span>
                      <span className="block text-xs font-extrabold text-[#294c35] truncate">
                        {stage.title}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Slide + Adeline Voice Stage */}
                <div className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 sm:p-7 space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-hand text-base text-[#d78472]">
                        {activeStage.phase} Scene
                      </span>
                      <h3 className="font-display text-2xl sm:text-3xl text-[#294c35]">
                        {activeStage.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleSpeakScene(
                          `${activeStage.title}. ${activeStage.content}. ${activeStage.keyTakeaway}`
                        )
                      }
                      className="min-h-[40px] px-3.5 py-1.5 rounded-full border border-[#dce7d5] bg-[#fbf5ea] hover:bg-[#f7f8f4] text-xs font-bold text-[#294c35] inline-flex items-center gap-1.5"
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="w-3.5 h-3.5 text-[#d78472]" />
                          <span>Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#7c9a61]" />
                          <span>Listen to Adeline</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Slide Anchor Deck */}
                  {activeStage.slidePoints?.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {activeStage.slidePoints.map((pt, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-2xl bg-[#fbf5ea] border border-[#e9ece5] text-xs font-bold text-[#294c35] leading-snug"
                        >
                          <span className="block font-mono text-[10px] text-[#7c9a61] mb-1">
                            SLIDE 0{i + 1}
                          </span>
                          {pt}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adeline Teaching Prose */}
                  <div className="text-sm sm:text-[15px] text-[#303734] leading-[1.75] whitespace-pre-wrap">
                    {activeStage.content}
                  </div>

                  {/* OpenMAIC Interactive Chalkboard / Whiteboard */}
                  {activeStage.whiteboardSteps?.length > 0 && (
                    <div className="rounded-2xl bg-[#294c35] text-[#fbf5ea] p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
                        <span className="font-hand text-lg text-[#d89a3c]">
                          Classroom Whiteboard
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums text-xs text-[#b9cbb7]">
                            Step {Math.min(whiteboardStepCount, activeStage.whiteboardSteps.length)} of{' '}
                            {activeStage.whiteboardSteps.length}
                          </span>
                          {whiteboardStepCount < activeStage.whiteboardSteps.length ? (
                            <button
                              type="button"
                              onClick={() => setWhiteboardStepCount((c) => c + 1)}
                              className="min-h-[34px] px-3 py-1 rounded-full bg-[#7c9a61] hover:bg-white hover:text-[#294c35] text-white text-xs font-extrabold inline-flex items-center gap-1 transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              <span>Next Step</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setWhiteboardStepCount(1)}
                              className="min-h-[34px] px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold"
                            >
                              Replay
                            </button>
                          )}
                        </div>
                      </div>

                      <ol className="space-y-2.5 text-sm">
                        {activeStage.whiteboardSteps
                          .slice(0, whiteboardStepCount)
                          .map((step, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="font-mono tabular-nums text-xs font-bold text-[#d89a3c] mt-0.5 shrink-0">
                                0{idx + 1}.
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                      </ol>
                    </div>
                  )}

                  {/* AI Classmate Roundtable Dialogue (OpenMAIC Peer Perspectives) */}
                  {activeStage.peerPerspectives?.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#294c35]">
                        <MessageSquare className="w-4 h-4 text-[#7c9a61]" />
                        <span>Classmate Roundtable</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeStage.peerPerspectives.map((peer, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-[#f7f8f4] border border-[#dce7d5] space-y-1"
                          >
                            <p className="text-xs font-extrabold text-[#294c35]">
                              {peer.speaker} ·{' '}
                              <span className="text-[#d78472] font-bold">{peer.role}</span>
                            </p>
                            <p className="text-xs text-[#303734] leading-relaxed">
                              “{peer.comment}”
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Principle & Socratic Pause */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-[#fbf5ea] border border-[#e9ece5] space-y-1">
                      <p className="text-xs font-extrabold text-[#294c35]">Key Principle</p>
                      <p className="text-xs sm:text-sm text-[#303734] leading-relaxed">
                        {activeStage.keyTakeaway}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#f7f8f4] border border-[#dce7d5] space-y-1">
                      <p className="text-xs font-extrabold text-[#d89a3c]">Pause & Reason</p>
                      <p className="text-xs sm:text-sm font-bold text-[#294c35] leading-relaxed">
                        {activeStage.socraticPrompt}
                      </p>
                    </div>
                  </div>

                  {/* Scene Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#e9ece5]">
                    <button
                      type="button"
                      disabled={activeStageIdx === 0}
                      onClick={() => {
                        stopSpeech();
                        setActiveStageIdx((i) => Math.max(0, i - 1));
                        setWhiteboardStepCount(1);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-full border border-[#dce7d5] text-xs font-bold text-[#294c35] disabled:opacity-40"
                    >
                      Previous Scene
                    </button>
                    {activeStageIdx < activeLesson.stages.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          stopSpeech();
                          setActiveStageIdx((i) => i + 1);
                          setWhiteboardStepCount(1);
                        }}
                        className="min-h-[44px] px-5 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold inline-flex items-center gap-2 transition-colors"
                      >
                        <span>Next Scene</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          stopSpeech();
                          setClassroomTab('simulation');
                        }}
                        className="min-h-[44px] px-5 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold inline-flex items-center gap-2 transition-colors"
                      >
                        <span>Open Interactive Lab Sim</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Inline Ask Adeline */}
                  <div className="pt-4 border-t border-[#e9ece5] space-y-3">
                    <form onSubmit={handleAskInClass} className="flex gap-2">
                      <input
                        type="text"
                        value={inlineQuestion}
                        onChange={(e) => setInlineQuestion(e.target.value)}
                        placeholder="Pause class and ask Adeline about this scene..."
                        className="flex-1 min-h-[44px] px-4 py-2 rounded-full border border-[#dce7d5] bg-[#fbf5ea]/60 text-xs sm:text-sm text-[#303734]"
                      />
                      <button
                        type="submit"
                        disabled={inlineLoading || !inlineQuestion.trim()}
                        className="min-h-[44px] px-5 py-2 rounded-full bg-[#294c35] text-white text-xs font-extrabold disabled:opacity-50 whitespace-nowrap"
                      >
                        {inlineLoading ? 'Thinking...' : 'Ask Adeline'}
                      </button>
                    </form>
                    {inlineReply && (
                      <div className="p-4 rounded-2xl bg-[#fbf5ea] border border-[#dce7d5] text-xs sm:text-sm text-[#303734] leading-relaxed">
                        <span className="font-bold text-[#294c35] block mb-1">Adeline:</span>
                        {inlineReply}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Sidebar: Family Levels + Evidence */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#7c9a61]" />
                    <h3 className="font-display text-2xl text-[#294c35]">Shared Family Levels</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-1 p-1 bg-[#f7f8f4] rounded-xl border border-[#e9ece5]">
                    {(['Sprout', 'Scout', 'Sovereign'] as LearningTier[]).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors ${
                          selectedTier === tier
                            ? 'bg-white text-[#294c35] shadow-sm'
                            : 'text-[#68726c]'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const tierKey = selectedTier.toLowerCase() as 'sprout' | 'scout' | 'sovereign';
                    const guide = activeLesson.familyTiers[tierKey];
                    return (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[#68726c]">
                          <span>Ages {guide.ageRange}</span>
                          <span className="font-extrabold text-[#294c35]">{guide.focusVerb}</span>
                        </div>
                        <p className="text-[#303734] leading-relaxed">{guide.taskDescription}</p>
                        <p className="text-[#68726c] pt-1">
                          <span className="font-bold text-[#294c35]">Deliverable: </span>
                          {guide.deliverable}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 space-y-4">
                  <h3 className="font-display text-2xl text-[#294c35]">Evidence & Worldview</h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="font-bold text-[#294c35] mb-1">Primary Evidence</p>
                      <ul className="space-y-1 text-[#68726c]">
                        {activeLesson.witnessProtocol.primaryEvidence.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>

                    {activeLesson.witnessProtocol.competingInterpretations.length > 0 && (
                      <div>
                        <p className="font-bold text-[#d89a3c] mb-1">
                          Interpretations & Open Questions
                        </p>
                        <ul className="space-y-1 text-[#68726c]">
                          {activeLesson.witnessProtocol.competingInterpretations.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <p className="font-bold text-[#294c35] mb-1">Creation Connection</p>
                      <p className="text-[#68726c] leading-relaxed">
                        {activeLesson.creationConnection}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 2: INTERACTIVE SIMULATION SANDBOX */}
          {classroomTab === 'simulation' && sim && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-[#fffdf9] border border-[#e9ece5] rounded-[28px] p-6 sm:p-8">
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-1">
                  <span className="font-hand text-lg text-[#d78472]">Interactive Simulation</span>
                  <h3 className="font-display text-3xl text-[#294c35]">{sim.title}</h3>
                </div>

                {/* Live Visual Gauge Stage */}
                <div className="p-6 rounded-2xl bg-[#fbf5ea] border border-[#dce7d5] space-y-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-[#68726c]">{sim.outputLabel}</p>
                      <p className="font-mono tabular-nums text-4xl font-semibold text-[#294c35]">
                        {simOutput}{' '}
                        <span className="text-base font-normal text-[#68726c]">
                          {sim.outputUnit}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums font-bold text-[#294c35]">
                      {activeSimVal < sim.optimalMin
                        ? '▼ BELOW OPTIMAL'
                        : activeSimVal > sim.optimalMax
                        ? '▲ ELEVATED / HIGH'
                        : '● BALANCED ZONE'}
                    </span>
                  </div>

                  {/* Interactive Visual Bar */}
                  <div className="space-y-2">
                    <div className="h-6 rounded-full bg-white border border-[#dce7d5] overflow-hidden p-1">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          activeSimVal < sim.optimalMin
                            ? 'bg-[#d89a3c]'
                            : activeSimVal > sim.optimalMax
                            ? 'bg-[#d78472]'
                            : 'bg-[#7c9a61]'
                        }`}
                        style={{ width: `${Math.max(4, simPercent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#68726c]">
                      <span>
                        {sim.min} {sim.unit}
                      </span>
                      <span>
                        Optimal: {sim.optimalMin}–{sim.optimalMax} {sim.unit}
                      </span>
                      <span>
                        {sim.max} {sim.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-5 p-5 rounded-2xl bg-[#f7f8f4] border border-[#e9ece5]">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#294c35]">
                  <Sliders className="w-4 h-4 text-[#7c9a61]" />
                  <span>Parameter Controls</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#294c35]">
                    <label htmlFor="sim-slider">{sim.variableLabel}</label>
                    <span className="font-mono tabular-nums">
                      {activeSimVal} {sim.unit}
                    </span>
                  </div>
                  <input
                    id="sim-slider"
                    type="range"
                    min={sim.min}
                    max={sim.max}
                    step={sim.step}
                    value={activeSimVal}
                    onChange={(e) => setSimValue(Number(e.target.value))}
                    className="w-full accent-[#294c35] cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#dce7d5] space-y-1.5 text-xs">
                  <p className="font-bold text-[#294c35]">What Is Happening Right Now:</p>
                  <p className="text-[#303734] leading-relaxed">
                    {activeSimVal < sim.optimalMin
                      ? sim.lowRangeNote
                      : activeSimVal > sim.optimalMax
                      ? sim.highRangeNote
                      : sim.optimalRangeNote}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSimValue(sim.defaultValue)}
                    className="min-h-[42px] px-4 py-2 rounded-full border border-[#dce7d5] bg-white text-xs font-bold text-[#294c35]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassroomTab('activity')}
                    className="flex-1 min-h-[42px] px-4 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Continue to Quiz & Lab</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 3: REINFORCING QUIZ + HANDS-ON SOVEREIGN LAB */}
          {classroomTab === 'activity' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 sm:p-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="font-display text-2xl text-[#294c35]">
                    Interactive Reasoning Checks
                  </h3>
                  <p className="text-xs text-[#68726c]">
                    Test your grasp of the evidence and catch common misconceptions before logging
                    credit.
                  </p>
                </div>

                <div className="space-y-6">
                  {activeLesson.reinforcingActivity.interactiveChecks.map((ck, qIdx) => {
                    const chosen = answers[ck.id];
                    const isAnswered = chosen !== undefined;
                    const isCorrect = chosen === ck.correctIndex;

                    return (
                      <div
                        key={ck.id}
                        className="p-4 sm:p-5 rounded-2xl bg-[#fbf5ea] border border-[#e9ece5] space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs text-[#68726c]">
                          <span className="font-bold text-[#294c35]">
                            Challenge 0{qIdx + 1} · {ck.type}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#303734] leading-snug">
                          {ck.question}
                        </p>

                        <div className="space-y-2">
                          {ck.options.map((opt, optIdx) => {
                            const selected = chosen === optIdx;
                            let btnStyle =
                              'border-[#dce7d5] bg-white text-[#303734] hover:bg-[#f7f8f4]';
                            if (isAnswered) {
                              if (optIdx === ck.correctIndex) {
                                btnStyle =
                                  'border-[#294c35] bg-[#7c9a61]/15 text-[#294c35] font-bold';
                              } else if (selected) {
                                btnStyle = 'border-red-400 bg-red-50 text-red-900';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() =>
                                  setAnswers((prev) => ({ ...prev, [ck.id]: optIdx }))
                                }
                                className={`w-full text-left min-h-[44px] px-4 py-2.5 rounded-xl border text-xs sm:text-sm transition-colors ${btnStyle}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {isAnswered && (
                          <div className="p-3.5 rounded-xl bg-white border border-[#dce7d5] space-y-1.5 text-xs">
                            <p
                              className={`font-extrabold ${
                                isCorrect ? 'text-[#294c35]' : 'text-[#d89a3c]'
                              }`}
                            >
                              {isCorrect ? 'Strong reasoning.' : 'Look closer at the evidence.'}
                            </p>
                            <p className="text-[#303734] leading-relaxed">{ck.explanation}</p>
                            <p className="text-[#68726c]">
                              <span className="font-bold text-[#294c35]">Common trap: </span>
                              {ck.misconceptionNote}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 sm:p-6 space-y-5">
                <div className="space-y-1">
                  <span className="font-hand text-base text-[#d78472]">
                    Hands-On Sovereign Lab Mission
                  </span>
                  <h3 className="font-display text-2xl text-[#294c35]">
                    {activeLesson.reinforcingActivity.handsOnMission.title}
                  </h3>
                  <p className="text-xs text-[#68726c]">
                    Capability built:{' '}
                    {activeLesson.reinforcingActivity.handsOnMission.capabilityDeveloped}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-extrabold text-[#294c35]">Materials Around the Home</p>
                  <ul className="text-xs text-[#68726c] space-y-1">
                    {activeLesson.reinforcingActivity.handsOnMission.materials.map((m, idx) => (
                      <li key={idx}>• {m}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-extrabold text-[#294c35]">Investigation Steps</p>
                  <div className="space-y-2">
                    {activeLesson.reinforcingActivity.handsOnMission.steps.map((step, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }))
                        }
                        className="w-full text-left p-3 rounded-xl border border-[#e9ece5] bg-[#fbf5ea] hover:bg-[#f7f8f4] flex items-start gap-3 transition-colors"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            completedSteps[idx] ? 'text-[#7c9a61]' : 'text-[#dce7d5]'
                          }`}
                        />
                        <span
                          className={`text-xs leading-relaxed ${
                            completedSteps[idx]
                              ? 'line-through text-[#68726c]'
                              : 'text-[#303734]'
                          }`}
                        >
                          {step}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#f7f8f4] border border-[#dce7d5] space-y-1 text-xs">
                  <p className="font-bold text-[#294c35]">Real-World Output & Documentation</p>
                  <p className="text-[#303734]">
                    {activeLesson.reinforcingActivity.handsOnMission.realWorldOutput}
                  </p>
                  <p className="text-[#68726c] pt-1">
                    {activeLesson.reinforcingActivity.handsOnMission.documentationPrompt}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setClassroomTab('demonstration')}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Demonstrate Understanding & Earn Credit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SCENE 4: MASTERY REVIEW -> REGISTRAR + PORTFOLIO + LONG-TERM MEMORY */}
          {classroomTab === 'demonstration' && (
            <div className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 sm:p-8 max-w-3xl space-y-6">
              <div className="space-y-1">
                <span className="font-hand text-base text-[#d78472]">
                  Mastery Review · {activeLesson.creditRecommendation.subjectCategory}
                </span>
                <h3 className="font-display text-3xl text-[#294c35]">
                  Explain What You Discovered
                </h3>
                <p className="text-sm text-[#68726c]">
                  Activity is not mastery. Teach back what you observed, explain the evidence, and
                  note what you built or tested. Adeline will review your reasoning, update her
                  long-term memory of {student.name}, and record your credit in the Registrar and
                  Portfolio.
                </p>
              </div>

              <form onSubmit={handleSubmitDemonstration} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="demo-explanation"
                    className="block text-xs font-extrabold text-[#294c35]"
                  >
                    Your Explanation & Defense of the Driving Question
                  </label>
                  <textarea
                    id="demo-explanation"
                    rows={5}
                    required
                    value={demonstrationText}
                    onChange={(e) => setDemonstrationText(e.target.value)}
                    placeholder={`Answer "${activeLesson.drivingQuestion}" in your own words using evidence you observed or read...`}
                    className="w-full rounded-2xl border border-[#dce7d5] bg-[#fbf5ea]/60 p-3.5 text-sm text-[#303734] focus:outline-none focus:ring-2 focus:ring-[#7c9a61]/40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label
                      htmlFor="demo-handson"
                      className="block text-xs font-extrabold text-[#294c35]"
                    >
                      Hands-On Mission Notes / Measurements
                    </label>
                    <input
                      id="demo-handson"
                      type="text"
                      value={handsOnNotes}
                      onChange={(e) => setHandsOnNotes(e.target.value)}
                      placeholder="What did you measure, build, or document?"
                      className="w-full min-h-[44px] rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 px-3.5 py-2 text-sm text-[#303734]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="demo-hours"
                      className="block text-xs font-extrabold text-[#294c35]"
                    >
                      Total Hours Spent
                    </label>
                    <input
                      id="demo-hours"
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="40"
                      value={hoursSpent}
                      onChange={(e) => setHoursSpent(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 px-3.5 py-2 text-sm font-mono tabular-nums text-[#303734]"
                    />
                  </div>
                </div>

                {evalError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                    {evalError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isEvaluating || demonstrationText.trim().length < 15}
                  className="min-h-[48px] px-6 py-3 rounded-full bg-[#7c9a61] hover:bg-[#294c35] disabled:opacity-50 text-white text-sm font-extrabold inline-flex items-center gap-2 transition-colors"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adeline is reviewing your understanding...</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      <span>Submit for Mastery Review & Log Credit</span>
                    </>
                  )}
                </button>
              </form>

              {evalResult && (
                <div className="p-5 rounded-2xl bg-[#f7f8f4] border-2 border-[#7c9a61]/50 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-[#294c35]">
                      <CheckCircle2 className="w-5 h-5 text-[#7c9a61]" />
                      <span>Recorded to Registrar, Portfolio & Memory · {evalResult.masteryLevel}</span>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-bold text-[#294c35]">
                      +{evalResult.approvedCredits.toFixed(2)} Credits Awarded
                    </span>
                  </div>
                  <p className="text-sm text-[#303734] leading-relaxed">
                    {evalResult.adelineFeedback}
                  </p>
                  <ul className="space-y-1 text-xs text-[#68726c]">
                    {evalResult.evidenceSummary.map((ev, i) => (
                      <li key={i}>• {ev}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-[#dce7d5] flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[#68726c]">
                      Next question: {evalResult.nextCuriosityPrompt}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        onGenerateLesson({
                          topic: evalResult.nextCuriosityPrompt,
                          track: activeLesson.track,
                        })
                      }
                      className="min-h-[38px] px-4 py-1.5 rounded-full bg-white border border-[#dce7d5] text-xs font-bold text-[#294c35] hover:bg-[#fbf5ea] inline-flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Explore Next</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

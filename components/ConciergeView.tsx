'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Compass,
  HelpCircle,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import {
  ChatMessage,
  ExperienceMode,
  GraduationGapItem,
  StudentMemory,
  StudentProfile,
  TrackName,
} from '@/lib/types';
import { CONVERSATION_STARTERS } from '@/lib/initial-data';
import { trackForCategory } from '@/lib/gaps';

interface ConciergeViewProps {
  student: StudentProfile;
  memory: StudentMemory;
  graduationGaps: GraduationGapItem[];
  messages: ChatMessage[];
  onUpdateMessages: (messages: ChatMessage[]) => void;
  onUpdateMemory: (updater: (prev: StudentMemory) => StudentMemory) => void;
  onLaunchClassroom: (params: {
    topic: string;
    track?: TrackName;
    experienceMode?: ExperienceMode;
  }) => void;
}

function createMessageId(suffix: string) {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${suffix}`;
}

export default function ConciergeView({
  student,
  memory,
  graduationGaps,
  messages,
  onUpdateMessages,
  onUpdateMemory,
  onLaunchClassroom,
}: ConciergeViewProps) {
  const [input, setInput] = useState('');
  const [familyMode, setFamilyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  const [memoryTab, setMemoryTab] = useState<'long' | 'short'>('long');
  const [customNote, setCustomNote] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length, isLoading]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isLoading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    onUpdateMessages(nextMessages);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/adeline/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          student,
          memory,
          graduationGaps,
          familyMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Adeline could not respond right now.');
      }

      // Persist Short-Term & Long-Term Memory learned from this turn
      if (data.memoryUpdates) {
        const { newShortTermTopic, newLongTermInsight, noticedGap } = data.memoryUpdates as {
          newShortTermTopic?: string;
          newLongTermInsight?: string;
          noticedGap?: string;
        };

        onUpdateMemory((prev) => ({
          shortTerm: {
            ...prev.shortTerm,
            currentSessionTopics: newShortTermTopic?.trim()
              ? Array.from(
                  new Set([newShortTermTopic.trim(), ...prev.shortTerm.currentSessionTopics])
                ).slice(0, 6)
              : prev.shortTerm.currentSessionTopics,
            lastUpdated: new Date().toISOString().split('T')[0],
          },
          longTerm: {
            ...prev.longTerm,
            learnedAboutStudent: newLongTermInsight?.trim()
              ? Array.from(
                  new Set([newLongTermInsight.trim(), ...prev.longTerm.learnedAboutStudent])
                ).slice(0, 10)
              : prev.longTerm.learnedAboutStudent,
            identifiedGaps: noticedGap?.trim()
              ? Array.from(
                  new Set([noticedGap.trim(), ...prev.longTerm.identifiedGaps])
                ).slice(0, 6)
              : prev.longTerm.identifiedGaps,
          },
        }));
      }

      const adelineMsg: ChatMessage = {
        id: createMessageId('adeline'),
        role: 'adeline',
        content: data.reply,
        timestamp: new Date().toISOString(),
        followUpPrompts: data.followUpPrompts ?? [],
        memoryNote: data.memoryUpdates?.newLongTermInsight || undefined,
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
                track: data.classroomSuggestion.track as TrackName,
                experienceMode: data.classroomSuggestion.experienceMode as ExperienceMode,
                drivingQuestion: data.classroomSuggestion.drivingQuestion,
              }
            : undefined,
      };

      onUpdateMessages([...nextMessages, adelineMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMemoryNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNote.trim()) return;
    onUpdateMemory((prev) => ({
      ...prev,
      longTerm: {
        ...prev.longTerm,
        learnedAboutStudent: [customNote.trim(), ...prev.longTerm.learnedAboutStudent].slice(0, 12),
      },
    }));
    setCustomNote('');
  };

  const topGap = graduationGaps[0];

  return (
    <div className="space-y-8">
      {/* Storybook Hero Split matching dearadeline.co */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-[#fbf5ea] border border-[#e9ece5] rounded-[28px] overflow-hidden">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <p className="font-hand text-xl sm:text-2xl text-[#d78472]">
              Welcome back, {student.name}
            </p>
            <h1 className="font-display text-3xl sm:text-5xl text-[#294c35] leading-[1.08] text-balance">
              Education as Unique as Your Child
            </h1>
            <p className="text-sm sm:text-base text-[#68726c] leading-relaxed max-w-2xl">
              Personal enough to follow their wonder. Structured enough to help them graduate.
              Adeline remembers how {student.name} learns, spots graduation gaps early, and turns
              today’s curiosity into a real classroom lesson.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#dce7d5]">
            <div className="text-xs text-[#68726c]">
              <span className="font-bold text-[#294c35]">{student.gradeLabel} · </span>
              <span>{student.currentFocus}</span>
            </div>
            <button
              type="button"
              onClick={() => setFamilyMode(!familyMode)}
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs font-bold rounded-full border transition-colors whitespace-nowrap shrink-0 ${
                familyMode
                  ? 'bg-[#7c9a61] text-white border-[#7c9a61]'
                  : 'bg-[#fffdf9] text-[#294c35] border-[#dce7d5] hover:bg-[#f7f8f4]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{familyMode ? 'Family Table: On' : 'Family Table: Off'}</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative min-h-[230px] lg:min-h-full bg-[#fbf5ea] flex items-center justify-center p-4">
          {!heroImgError ? (
            <img
              src="/landing-illustration.webp"
              alt="Dear Adeline storybook illustration of family learning and exploration"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="w-full h-full max-h-[340px] object-contain rounded-2xl"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <Compass className="w-8 h-8 text-[#294c35] mb-2" />
              <p className="font-display text-xl text-[#294c35]">Dear Adeline Academy</p>
            </div>
          )}
        </div>
      </section>

      {/* Main Studio: Dear Adeline Chat Frame + Memory & Gap Bridge Deck */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Authentic dearadeline.co Framed Chat Window */}
        <div className="lg:col-span-8 adeline-chat-frame rounded-[30px] overflow-hidden flex flex-col">
          {/* Forest Green Chat Header with Adeline's Official Portrait */}
          <div className="bg-[#294c35] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src="/adeline-face.webp"
                alt="Adeline portrait"
                referrerPolicy="no-referrer"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-[16px] object-cover object-top bg-white shrink-0"
              />
              <div className="min-w-0">
                <span className="block text-[10px] font-extrabold tracking-[0.13em] uppercase text-[#b9cbb7]">
                  LEARNING CONCIERGE · {student.name.toUpperCase()}
                </span>
                <h2 className="font-display text-2xl text-white leading-tight truncate">
                  Dear Adeline
                </h2>
              </div>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => onUpdateMessages([])}
                className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors whitespace-nowrap shrink-0"
              >
                New Chat
              </button>
            )}
          </div>

          {/* Dotted Warm Cream Conversation Stream */}
          <div className="adeline-dots p-5 sm:p-7 space-y-6 min-h-[340px] max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="space-y-6">
                <div className="bg-white rounded-[20px] rounded-bl-[6px] p-5 shadow-[0_5px_10px_rgba(45,55,47,0.08)] max-w-[90%] space-y-2">
                  <p className="font-display text-xl text-[#294c35]">
                    Hi {student.name}! What are you wondering about today?
                  </p>
                  <p className="text-sm text-[#303734] leading-relaxed">
                    {memory.shortTerm.currentSessionTopics[0] || student.interests[0] ? (
                      <>
                        I remember you’ve been exploring{' '}
                        <span className="font-bold text-[#294c35]">
                          {memory.shortTerm.currentSessionTopics[0] || student.interests[0]}
                        </span>
                        . Ask me any question—or pick a curiosity below—and we can turn it straight
                        into an interactive Classroom lesson!
                      </>
                    ) : (
                      <>
                        I’m ready to learn alongside you from a fresh start. Tell me what you’re
                        curious about today, what you enjoy building or reading, or ask any question
                        below—we can turn it straight into an interactive Classroom lesson!
                      </>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONVERSATION_STARTERS.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      onClick={() => sendMessage(starter.label)}
                      className="text-left p-4 rounded-2xl border border-[#e9ece5] bg-white hover:border-[#7c9a61] shadow-[0_4px_12px_rgba(44,57,48,0.05)] transition-colors flex flex-col justify-between gap-1.5 min-h-[84px]"
                    >
                      <span className="font-hand text-sm text-[#d78472]">{starter.track}</span>
                      <span className="text-sm font-bold text-[#303734] leading-snug">
                        {starter.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === 'user' ? 'flex justify-end' : 'space-y-4'}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] sm:max-w-[78%] bg-[#637b65] text-white rounded-[20px] rounded-br-[6px] px-5 py-3.5 text-sm sm:text-[15px] font-bold leading-relaxed shadow-[0_5px_10px_rgba(45,55,47,0.1)]">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-[95%]">
                      <div className="bg-white text-[#303734] rounded-[20px] rounded-bl-[6px] p-5 shadow-[0_5px_10px_rgba(45,55,47,0.08)] space-y-3">
                        <div className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>

                        {msg.memoryNote && (
                          <p className="text-xs text-[#68726c] pt-2 border-t border-[#e9ece5] flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-[#7c9a61] shrink-0" />
                            <span>Remembered: {msg.memoryNote}</span>
                          </p>
                        )}
                      </div>

                      {msg.evidenceDistinction &&
                        (msg.evidenceDistinction.established.length > 0 ||
                          msg.evidenceDistinction.openQuestions.length > 0) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {msg.evidenceDistinction.established.length > 0 && (
                              <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#dce7d5] space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#294c35]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#7c9a61]" />
                                  <span>Established by Evidence</span>
                                </div>
                                <ul className="space-y-1 text-xs text-[#68726c] leading-relaxed">
                                  {msg.evidenceDistinction.established.map((fact, idx) => (
                                    <li key={idx}>• {fact}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {msg.evidenceDistinction.openQuestions.length > 0 && (
                              <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#dce7d5] space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#d89a3c]">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  <span>Open to Investigate</span>
                                </div>
                                <ul className="space-y-1 text-xs text-[#68726c] leading-relaxed">
                                  {msg.evidenceDistinction.openQuestions.map((oq, idx) => (
                                    <li key={idx}>• {oq}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                      {msg.suggestedClassroom && (
                        <div className="p-4 rounded-2xl bg-[#f7f8f4] border-2 border-[#7c9a61]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="font-hand text-sm text-[#d78472]">
                              {msg.suggestedClassroom.track} · {msg.suggestedClassroom.experienceMode}
                            </span>
                            <p className="font-display text-xl text-[#294c35]">
                              {msg.suggestedClassroom.topic}
                            </p>
                            <p className="text-xs text-[#68726c]">
                              {msg.suggestedClassroom.drivingQuestion}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onLaunchClassroom({
                                topic: msg.suggestedClassroom!.topic,
                                track: msg.suggestedClassroom!.track,
                                experienceMode: msg.suggestedClassroom!.experienceMode,
                              })
                            }
                            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 shadow-sm"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>Open Classroom</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {msg.followUpPrompts && msg.followUpPrompts.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.followUpPrompts.map((prompt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => sendMessage(prompt)}
                              className="text-left text-xs font-bold px-3.5 py-2 min-h-[40px] rounded-xl border border-[#dce7d5] bg-white hover:bg-[#f7f8f4] text-[#294c35] transition-colors"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-3 text-sm font-bold text-[#294c35] py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#7c9a61]" />
                <span>Adeline is thinking with {student.name}’s learning memory...</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {error}
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-4 border-t border-[#e9ece5] bg-[#fffdf9] flex items-end gap-3"
          >
            <label htmlFor="adeline-query-input" className="sr-only">
              Ask Adeline a question
            </label>
            <textarea
              id="adeline-query-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={`Ask Adeline anything, ${student.name}...`}
              className="flex-1 resize-none rounded-2xl border border-[#dce7d5] bg-[#fbf5ea]/60 px-4 py-2.5 text-sm text-[#303734] placeholder:text-[#68726c]/70 focus:outline-none focus:ring-2 focus:ring-[#7c9a61]/40"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="min-h-[48px] min-w-[48px] px-5 rounded-full bg-[#7c9a61] hover:bg-[#294c35] disabled:opacity-50 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>

        {/* Right Sidebar: Short & Long Term Memory + Graduation Gap Bridge */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Graduation Readiness Gap Bridge */}
          {topGap && (
            <div className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 space-y-3.5 shadow-[0_8px_22px_rgba(44,57,48,0.06)]">
              <div className="space-y-1">
                <span className="font-hand text-base text-[#d78472]">Graduation Readiness</span>
                <h3 className="font-display text-2xl text-[#294c35]">
                  Fill {student.name}’s Next Gap
                </h3>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fbf5ea] border border-[#e9ece5] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#294c35]">
                  <span>{topGap.category}</span>
                  <span className="font-mono tabular-nums">
                    {topGap.earned.toFixed(2)} / {topGap.required.toFixed(1)} cr
                  </span>
                </div>
                <p className="text-xs text-[#68726c] leading-relaxed">
                  {student.interests.length > 0
                    ? `Bridge via ${student.name}’s interests: ${topGap.suggestedBridgeTopic}`
                    : `Suggested starting investigation: ${topGap.suggestedBridgeTopic}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onLaunchClassroom({
                    topic: topGap.suggestedBridgeTopic,
                    track: trackForCategory(topGap.category),
                    experienceMode: 'investigation',
                  })
                }
                className="w-full min-h-[44px] px-4 py-2.5 rounded-full bg-[#294c35] hover:bg-[#7c9a61] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Bridge Gap in Classroom</span>
              </button>
            </div>
          )}

          {/* Short-Term & Long-Term Memory Vault */}
          <div className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 space-y-4 shadow-[0_8px_22px_rgba(44,57,48,0.06)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-hand text-sm text-[#d78472]">Adeline’s Memory</span>
                <h3 className="font-display text-2xl text-[#294c35]">
                  How {student.name} Learns
                </h3>
              </div>
              <Brain className="w-5 h-5 text-[#7c9a61] shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-[#f7f8f4] rounded-xl border border-[#e9ece5]">
              <button
                type="button"
                onClick={() => setMemoryTab('long')}
                className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors ${
                  memoryTab === 'long' ? 'bg-white text-[#294c35] shadow-sm' : 'text-[#68726c]'
                }`}
              >
                Long-Term ({memory.longTerm.learnedAboutStudent.length})
              </button>
              <button
                type="button"
                onClick={() => setMemoryTab('short')}
                className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors ${
                  memoryTab === 'short' ? 'bg-white text-[#294c35] shadow-sm' : 'text-[#68726c]'
                }`}
              >
                Short-Term ({memory.shortTerm.currentSessionTopics.length})
              </button>
            </div>

            {memoryTab === 'long' ? (
              <div className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <p className="font-bold text-[#294c35]">Learned About {student.name}</p>
                  {memory.longTerm.learnedAboutStudent.length === 0 ? (
                    <p className="text-[#68726c] leading-relaxed">
                      Clean slate—as {student.name} chats with Adeline, completes lessons, or
                      takes the Registrar assessment, real insights will appear here.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-[#68726c] leading-relaxed">
                      {memory.longTerm.learnedAboutStudent.map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {memory.longTerm.masteredConcepts.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#e9ece5]">
                    <p className="font-bold text-[#294c35]">Mastered Concepts</p>
                    <ul className="space-y-1 text-[#68726c]">
                      {memory.longTerm.masteredConcepts.slice(0, 4).map((m, idx) => (
                        <li key={idx}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <form
                  onSubmit={handleAddMemoryNote}
                  className="pt-2 border-t border-[#e9ece5] flex gap-2"
                >
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder={`Add parent note for ${student.name}...`}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-xs text-[#303734]"
                  />
                  <button
                    type="submit"
                    aria-label="Save memory note"
                    className="min-h-[38px] min-w-[38px] rounded-xl bg-[#7c9a61] text-white flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <p className="font-bold text-[#294c35]">Current Session Focus</p>
                  {memory.shortTerm.currentSessionTopics.length === 0 ? (
                    <p className="text-[#68726c]">No active session topics yet today.</p>
                  ) : (
                    <ul className="space-y-1 text-[#68726c]">
                      {memory.shortTerm.currentSessionTopics.map((t, idx) => (
                        <li key={idx}>• {t}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {memory.shortTerm.activeBookProgress && (
                  <p className="text-[#68726c] pt-2 border-t border-[#e9ece5]">
                    <span className="font-bold text-[#294c35]">Reading Now: </span>
                    {memory.shortTerm.activeBookProgress}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onUpdateMemory((prev) => ({
                      ...prev,
                      shortTerm: {
                        currentSessionTopics: [],
                        recentMisconceptions: [],
                        activeBookProgress: null,
                        lastUpdated: new Date().toISOString().split('T')[0],
                      },
                    }))
                  }
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#e9ece5] text-[#68726c] hover:text-[#303734] inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Short-Term Session</span>
                </button>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

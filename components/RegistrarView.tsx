'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Download,
  Plus,
  Printer,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  CreditCategory,
  GraduationGapItem,
  GraduationMap,
  RegistrarEntry,
  StudentMemory,
  StudentProfile,
  TrackName,
} from '@/lib/types';
import { GRADUATION_REQUIREMENTS } from '@/lib/initial-data';
import { trackForCategory } from '@/lib/gaps';
import GraduationAssessmentPanel from './GraduationAssessmentPanel';

interface RegistrarViewProps {
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
  onAddEntry: (entry: RegistrarEntry) => void;
  onBridgeGap: (topic: string, track: TrackName) => void;
  onLaunchMilestoneClassroom: (params: {
    topic: string;
    track: TrackName;
    milestoneId: string;
    sourceContext: string;
  }) => void;
}

const CATEGORIES: CreditCategory[] = GRADUATION_REQUIREMENTS.map((r) => r.category);

const TRACKS: TrackName[] = [
  "God's Creation & Science",
  'Truth-Based History',
  'Justice & Change-making',
  'Mathematics & Logic',
  'Literature & Rhetoric',
  'Creative Economy & Practical Arts',
  'Discipleship & Stewardship',
];

export default function RegistrarView({
  student,
  memory,
  entries,
  graduationGaps,
  graduationMap,
  onSaveGraduationMap,
  onToggleMilestoneStatus,
  onAddEntry,
  onBridgeGap,
  onLaunchMilestoneClassroom,
}: RegistrarViewProps) {
  const [filterCategory, setFilterCategory] = useState<CreditCategory | 'All'>('All');
  const [showAddForm, setShowAddForm] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CreditCategory>('Practical Arts & Economy');
  const [track, setTrack] = useState<TrackName>('Creative Economy & Practical Arts');
  const [hours, setHours] = useState('2.0');
  const [credits, setCredits] = useState('0.10');
  const [notes, setNotes] = useState('');

  const studentEntries = entries
    .filter((e) => e.studentId === student.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredEntries =
    filterCategory === 'All'
      ? studentEntries
      : studentEntries.filter((e) => e.creditCategory === filterCategory);

  const totalRequired = GRADUATION_REQUIREMENTS.reduce((s, r) => s + r.requiredCredits, 0);
  const totalEarned = studentEntries.reduce((s, e) => s + e.creditsEarned, 0);
  const totalHours = studentEntries.reduce((s, e) => s + e.hours, 0);

  const creditsByCategory = GRADUATION_REQUIREMENTS.map((req) => {
    const earned = studentEntries
      .filter((e) => e.creditCategory === req.category)
      .reduce((sum, e) => sum + e.creditsEarned, 0);
    const pct = Math.min(100, Math.round((earned / req.requiredCredits) * 100));
    return {
      ...req,
      earned,
      pct,
    };
  });

  const topGaps = graduationGaps.filter((g) => g.earned < g.required).slice(0, 2);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddEntry({
      id: `reg-manual-${Date.now()}`,
      studentId: student.id,
      date: new Date().toISOString().split('T')[0],
      title: title.trim(),
      track,
      creditCategory: category,
      hours: Math.max(0.25, parseFloat(hours) || 1),
      creditsEarned: Math.max(0.05, parseFloat(credits) || 0.05),
      masteryLevel: 'Demonstrated',
      witnessVerified: false,
      sourceType: 'practical-life',
      notes: notes.trim() || 'Recorded via Family Registrar.',
    });
    setTitle('');
    setNotes('');
    setShowAddForm(false);
  };

  const handleExportCsv = () => {
    const header = ['Date', 'Student', 'Title', 'Category', 'Track', 'Hours', 'Credits', 'Mastery'];
    const rows = studentEntries.map((e) => [
      e.date,
      student.name,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.creditCategory}"`,
      `"${e.track}"`,
      e.hours.toFixed(2),
      e.creditsEarned.toFixed(2),
      e.masteryLevel,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name.toLowerCase()}-dear-adeline-transcript.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section className="bg-[#fbf5ea] border border-[#e9ece5] rounded-[28px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="font-hand text-xl text-[#d78472]">
              Official Homeschool Registrar · {student.name}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-[#294c35]">
              Graduation Credit Ledger & Transcript
            </h1>
            <p className="text-sm text-[#68726c]">
              {student.gradeLabel} · Everything learned builds clearly toward {student.name}’s
              Class of {student.targetGraduationYear} graduation path.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 no-print">
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="min-h-[44px] px-4 py-2 rounded-full bg-[#7c9a61] hover:bg-[#294c35] text-white text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Log Practical Life Work</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[44px] px-4 py-2 rounded-full border border-[#dce7d5] bg-[#fffdf9] hover:bg-[#f7f8f4] text-xs font-bold text-[#294c35] inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] px-4 py-2 rounded-full border border-[#dce7d5] bg-[#fffdf9] hover:bg-[#f7f8f4] text-xs font-bold text-[#294c35] inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print Transcript</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#dce7d5]">
          <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#e9ece5]">
            <p className="text-xs text-[#68726c]">Credits Earned</p>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#294c35] mt-1">
              {totalEarned.toFixed(2)}{' '}
              <span className="text-sm font-normal text-[#68726c]">/ {totalRequired.toFixed(1)}</span>
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#e9ece5]">
            <p className="text-xs text-[#68726c]">Documented Hours</p>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#294c35] mt-1">
              {totalHours.toFixed(1)}h
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#e9ece5]">
            <p className="text-xs text-[#68726c]">Recorded Milestones</p>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#294c35] mt-1">
              {studentEntries.length}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#e9ece5]">
            <p className="text-xs text-[#68726c]">Target Graduation</p>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#7c9a61] mt-1">
              {student.targetGraduationYear}
            </p>
          </div>
        </div>
      </section>

      {showAddForm && (
        <form
          onSubmit={handleManualSubmit}
          className="bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 sm:p-6 space-y-4 no-print"
        >
          <h2 className="font-display text-2xl text-[#294c35]">
            Log Practical Life, Homesteading, or Outside Work
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-[#303734]">Activity Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Built cedar raised garden bed & calculated soil volume"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#303734]">Credit Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CreditCategory)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-xs font-bold"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#303734]">Track</label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value as TrackName)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-xs font-bold"
              >
                {TRACKS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#303734]">Hours</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-sm font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#303734]">Credit Earned</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="1.0"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-sm font-mono tabular-nums"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-[#303734]">
                Evidence / Capability Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What capability was demonstrated?"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/60 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="min-h-[44px] px-4 py-2 rounded-full border border-[#dce7d5] text-xs font-bold text-[#68726c]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-full bg-[#7c9a61] text-white text-xs font-extrabold"
            >
              Save to Registrar
            </button>
          </div>
        </form>
      )}

      <GraduationAssessmentPanel
        key={student.id}
        student={student}
        memory={memory}
        entries={entries}
        graduationGaps={graduationGaps}
        graduationMap={graduationMap}
        onSaveGraduationMap={onSaveGraduationMap}
        onToggleMilestoneStatus={onToggleMilestoneStatus}
        onLaunchMilestoneClassroom={onLaunchMilestoneClassroom}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 sm:p-6 space-y-5 shadow-[0_8px_22px_rgba(44,57,48,0.05)]">
          <div className="space-y-1">
            <h2 className="font-display text-2xl text-[#294c35]">Credit Distribution</h2>
            <p className="text-xs text-[#68726c]">
              24.0 Carnegie credits across 7 foundational domains
            </p>
          </div>

          <div className="space-y-4">
            {creditsByCategory.map((row) => (
              <div key={row.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#303734]">{row.category}</span>
                  <span className="font-mono tabular-nums text-[#68726c]">
                    {row.earned.toFixed(2)} / {row.requiredCredits.toFixed(1)} cr
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#f7f8f4] border border-[#e9ece5] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#7c9a61] transition-all"
                    style={{ width: `${Math.max(row.earned > 0 ? 4 : 0, row.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {topGaps.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#fbf5ea] border border-[#dce7d5] space-y-3 no-print">
              <div className="flex items-center gap-2 text-xs font-bold text-[#d89a3c]">
                <AlertCircle className="w-4 h-4" />
                <span>Graduation Gap Detection</span>
              </div>
              <p className="text-xs text-[#68726c] leading-relaxed">
                For age {student.age}, {student.name}’s top priority gap is{' '}
                <span className="font-bold text-[#294c35]">{topGaps[0].category}</span>
                {topGaps[1] ? (
                  <>
                    {' '}
                    followed by{' '}
                    <span className="font-bold text-[#294c35]">{topGaps[1].category}</span>
                  </>
                ) : null}
                . Adeline can bridge this using {student.name}’s favorite interests:
              </p>
              <button
                type="button"
                onClick={() =>
                  onBridgeGap(
                    topGaps[0].suggestedBridgeTopic,
                    trackForCategory(topGaps[0].category)
                  )
                }
                className="w-full min-h-[42px] px-4 py-2 rounded-full bg-[#294c35] hover:bg-[#7c9a61] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Gap-Bridging Classroom</span>
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-[#fffdf9] border border-[#e9ece5] rounded-[24px] p-5 sm:p-6 space-y-5 shadow-[0_8px_22px_rgba(44,57,48,0.05)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-[#294c35]">Recorded Transcript Ledger</h2>
            <select
              aria-label="Filter transcript by category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as CreditCategory | 'All')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#dce7d5] bg-[#fbf5ea]/70 text-xs font-bold text-[#294c35]"
            >
              <option value="All">All Subject Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {filteredEntries.length === 0 ? (
            <p className="text-sm text-[#68726c] py-8 text-center">
              No credits recorded in this category yet. Complete a Classroom or log practical work
              above.
            </p>
          ) : (
            <div className="divide-y divide-[#e9ece5]">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="font-sans text-sm font-extrabold text-[#303734]">
                        {entry.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#68726c]">
                        <span className="font-mono tabular-nums">{entry.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>{entry.creditCategory}</span>
                        <span aria-hidden="true">·</span>
                        <span>{entry.masteryLevel}</span>
                        {entry.witnessVerified && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-[#294c35] font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#7c9a61]" />
                              Witness Verified
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums shrink-0">
                      <span className="block text-sm font-semibold text-[#294c35]">
                        +{entry.creditsEarned.toFixed(2)} cr
                      </span>
                      <span className="block text-xs text-[#68726c]">{entry.hours.toFixed(1)}h</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#68726c] leading-relaxed">{entry.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

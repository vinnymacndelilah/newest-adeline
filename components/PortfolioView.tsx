'use client';

import React, { useState } from 'react';
import { Award, CheckCircle2, X } from 'lucide-react';
import { PortfolioArtifact, StudentProfile } from '@/lib/types';

interface PortfolioViewProps {
  student: StudentProfile;
  artifacts: PortfolioArtifact[];
}

export default function PortfolioView({ student, artifacts }: PortfolioViewProps) {
  const [filterMastery, setFilterMastery] = useState<'All' | 'Mastery' | 'Demonstrated'>('All');
  const [selectedArtifact, setSelectedArtifact] = useState<PortfolioArtifact | null>(null);

  const studentArtifacts = artifacts
    .filter((a) => a.studentId === student.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const visibleArtifacts =
    filterMastery === 'All'
      ? studentArtifacts
      : studentArtifacts.filter((a) => a.masteryLevel === filterMastery);

  return (
    <div className="space-y-8">
      {/* Portfolio Header */}
      <section className="bg-[#fbf5ea] border border-[#e9ece5] rounded-[28px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="font-hand text-xl text-[#d78472]">
            Evidence of Capability · {student.name}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-[#294c35]">
            {student.name}’s Learning Portfolio
          </h1>
          <p className="text-sm text-[#68726c] max-w-2xl">
            A living archive of what {student.name} has investigated, built, explained, and defended—
            preserving real demonstrations of understanding rather than completed busywork.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#fffdf9] border border-[#e9ece5] rounded-xl w-fit shrink-0">
          {(['All', 'Mastery', 'Demonstrated'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterMastery(tab)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterMastery === tab
                  ? 'bg-[#7c9a61] text-white shadow-sm'
                  : 'text-[#68726c] hover:text-[#294c35]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Artifacts Grid */}
      {visibleArtifacts.length === 0 ? (
        <div className="bg-white border border-[#DCE2D8] rounded-2xl p-12 text-center space-y-2">
          <Award className="w-8 h-8 text-[#234E36] mx-auto" />
          <h2 className="font-editorial text-xl font-semibold text-[#1A241E]">
            No artifacts in this filter yet
          </h2>
          <p className="text-sm text-[#55635A]">
            Complete a Classroom lesson and submit a mastery demonstration to add evidence here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleArtifacts.map((artifact) => (
            <article
              key={artifact.id}
              onClick={() => setSelectedArtifact(artifact)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedArtifact(artifact);
                }
              }}
              className="bg-white border border-[#DCE2D8] hover:border-[#234E36]/60 rounded-2xl p-6 flex flex-col justify-between gap-4 cursor-pointer transition-colors text-left"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#55635A]">
                  <span>
                    {artifact.track} · {artifact.creditCategory}
                  </span>
                  <span className="font-mono tabular-nums">{artifact.createdAt}</span>
                </div>

                <h2 className="font-editorial text-xl font-semibold text-[#1A241E] leading-snug">
                  {artifact.title}
                </h2>

                <p className="text-xs font-medium text-[#234E36]">
                  {artifact.drivingQuestion}
                </p>

                <p className="text-sm text-[#55635A] leading-relaxed line-clamp-3">
                  {artifact.studentDemonstration}
                </p>
              </div>

              <div className="pt-4 border-t border-[#DCE2D8] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1A241E] inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#234E36]" />
                  {artifact.masteryLevel}
                </span>
                <span className="font-mono tabular-nums text-[#55635A]">
                  +{artifact.creditsAwarded.toFixed(2)} cr · {artifact.hoursLogged.toFixed(1)}h ·
                  View Dossier →
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Artifact Dossier Modal */}
      {selectedArtifact && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedArtifact(null)}
        >
          <div
            className="bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-[#DCE2D8] p-6 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#55635A]">
                  <span>{selectedArtifact.track}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{selectedArtifact.createdAt}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#234E36]">
                    {selectedArtifact.masteryLevel}
                  </span>
                </div>
                <h2 className="font-editorial text-2xl font-semibold text-[#1A241E]">
                  {selectedArtifact.title}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close dossier"
                onClick={() => setSelectedArtifact(null)}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCE2D8] flex items-center justify-center text-[#55635A] hover:text-[#1A241E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#DCE2D8] space-y-1">
                <p className="text-xs font-semibold text-[#55635A]">Driving Question</p>
                <p className="font-medium text-[#1A241E]">{selectedArtifact.drivingQuestion}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#234E36]">
                  {student.name}’s Demonstrated Understanding
                </p>
                <p className="text-[#1A241E] leading-relaxed whitespace-pre-wrap">
                  {selectedArtifact.studentDemonstration}
                </p>
              </div>

              {selectedArtifact.handsOnNotes && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#55635A]">Hands-On & Lab Notes</p>
                  <p className="text-xs text-[#1A241E] leading-relaxed">
                    {selectedArtifact.handsOnNotes}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#55635A]">Verified Evidence</p>
                <ul className="space-y-1 text-xs text-[#1A241E]">
                  {selectedArtifact.evidenceSummary.map((ev, i) => (
                    <li key={i}>• {ev}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#EEF1EC] border border-[#DCE2D8] space-y-1.5">
                <p className="text-xs font-semibold text-[#234E36]">Adeline’s Evaluation</p>
                <p className="text-sm text-[#1A241E] leading-relaxed">
                  {selectedArtifact.adelineFeedback}
                </p>
              </div>

              <div className="pt-3 border-t border-[#DCE2D8] flex items-center justify-between text-xs font-mono tabular-nums text-[#55635A]">
                <span>Category: {selectedArtifact.creditCategory}</span>
                <span>
                  +{selectedArtifact.creditsAwarded.toFixed(2)} Credits ·{' '}
                  {selectedArtifact.hoursLogged.toFixed(1)} Hours
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

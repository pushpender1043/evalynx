import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  AIGeneratorIllustration,
  CreateTestIllustration,
  EmptyNotificationsIllustration,
  EmptyPerformanceIllustration,
  EmptyStudentsIllustration,
  EmptySubmissionsIllustration,
  EmptyTestsIllustration,
  JoinWithCodeIllustration,
  PracticeModeIllustration,
  PromoIllustration,
  QuestionBankIllustration,
  ResultsIllustration,
} from '../components/illustrations';

const ITEMS = [
  { name: 'CreateTestIllustration', desc: 'Clipboard with checklist & pencil', Component: CreateTestIllustration, darkBg: false },
  { name: 'AIGeneratorIllustration', desc: 'Document with sparkles & wand', Component: AIGeneratorIllustration, darkBg: false },
  { name: 'QuestionBankIllustration', desc: 'Stacked cards & tabbed folder', Component: QuestionBankIllustration, darkBg: false },
  { name: 'ResultsIllustration', desc: 'Bar chart with magnifier', Component: ResultsIllustration, darkBg: false },
  { name: 'EmptyTestsIllustration', desc: 'Open folder with floating plus', Component: EmptyTestsIllustration, darkBg: false },
  { name: 'EmptyPerformanceIllustration', desc: 'Chart axes with mint sprout', Component: EmptyPerformanceIllustration, darkBg: false },
  { name: 'EmptySubmissionsIllustration', desc: 'Inbox tray with paper plane', Component: EmptySubmissionsIllustration, darkBg: false },
  { name: 'EmptyNotificationsIllustration', desc: 'Bell with calm sparkles', Component: EmptyNotificationsIllustration, darkBg: false },
  { name: 'JoinWithCodeIllustration', desc: 'Ticket card with code boxes', Component: JoinWithCodeIllustration, darkBg: false },
  { name: 'PracticeModeIllustration', desc: 'Bullseye target with dart', Component: PracticeModeIllustration, darkBg: false },
  { name: 'EmptyStudentsIllustration', desc: 'Avatar silhouettes with plus', Component: EmptyStudentsIllustration, darkBg: false },
  { name: 'PromoIllustration', desc: 'Spark bulb for purple promo card', Component: PromoIllustration, darkBg: true },
] as const;

export function IllustrationShowcasePage() {
  const [previewDark, setPreviewDark] = useState(false);

  return (
    <div className={previewDark ? 'dark' : ''}>
      <div className="min-h-screen bg-[var(--bg-canvas)] px-6 py-8 text-[var(--text-primary)] transition-colors">
        <div className="mx-auto max-w-6xl rounded-[40px] bg-[var(--bg-panel)] p-6 shadow-[var(--shadow-panel)] sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
            <div>
              <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-soft-text)]">
                Dev Showcase
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">
                Evalynx Custom SVG Illustrations ({ITEMS.length})
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                100% inline vector SVGs with 2px rounded strokes, flat lavender fills, and automatic Light / Dark theme tokens.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
              <button
                type="button"
                onClick={() => setPreviewDark(false)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                  !previewDark
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sun className="h-3.5 w-3.5" /> Light
              </button>
              <button
                type="button"
                onClick={() => setPreviewDark(true)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                  previewDark
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Moon className="h-3.5 w-3.5" /> Dark
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ITEMS.map(({ name, desc, Component, darkBg }) => (
              <div
                key={name}
                className={`flex flex-col items-center rounded-[28px] p-6 text-center transition-transform hover:-translate-y-0.5 ${
                  darkBg
                    ? 'bg-gradient-to-b from-[#7A6CF0] to-[#6C5CE7] text-white shadow-[var(--shadow-clay-primary)]'
                    : 'clay-card'
                }`}
              >
                <div className="flex h-32 w-full items-center justify-center">
                  <Component size={124} />
                </div>
                <p className="mt-3 text-sm font-bold">{name}</p>
                <p
                  className={`mt-1 text-xs ${
                    darkBg ? 'text-white/80' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

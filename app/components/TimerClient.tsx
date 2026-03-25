'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRoutine } from '../lib/storage';
import { playSoundForPhase, playCountdownTick, playComplete } from '../lib/sounds';
import { Phase, PhaseType, Routine } from '../types';

// ─── Phase sequence builder ───────────────────────────────────────────────────

function buildSequence(routine: Routine): Phase[] {
  const phases: Phase[] = [];
  const rounds = routine.rounds ?? 1;

  if (routine.warmupDuration > 0) {
    phases.push({ type: 'warmup', duration: routine.warmupDuration, label: 'Warm Up' });
  }

  for (let r = 0; r < rounds; r++) {
    routine.exercises.forEach((ex, i) => {
      phases.push({
        type: 'exercise',
        duration: routine.exerciseDuration,
        label: ex.name || `Exercise ${i + 1}`,
        round: r + 1,
      });
      const isLastExercise = i === routine.exercises.length - 1;
      const isLastRound = r === rounds - 1;
      if (!isLastExercise && routine.restDuration > 0) {
        phases.push({ type: 'rest', duration: routine.restDuration, label: 'Rest', round: r + 1 });
      } else if (isLastExercise && !isLastRound && routine.restDuration > 0) {
        phases.push({ type: 'rest', duration: routine.restDuration, label: `Round ${r + 2}`, round: r + 1 });
      }
    });
  }

  if (routine.cooldownDuration > 0) {
    phases.push({ type: 'cooldown', duration: routine.cooldownDuration, label: 'Cool Down' });
  }

  return phases;
}

// ─── Phase style config ───────────────────────────────────────────────────────

const PHASE_CONFIG: Record<PhaseType, {
  color: string;
  glow: string;
  bg: string;
  border: string;
  badge: string;
  ringColor: string;
  glowColor: string;
  icon: string;
}> = {
  warmup: {
    color: 'text-[#dd00ff]',
    glow: 'drop-shadow-[0_0_60px_rgba(221,0,255,1)] drop-shadow-[0_0_20px_rgba(221,0,255,0.8)]',
    bg: 'bg-[#120018]/90',
    border: 'border-[#dd00ff]/20',
    badge: 'bg-[#0a0010]/95 text-[#dd00ff] border-[#dd00ff]/30',
    ringColor: '#dd00ff',
    glowColor: 'bg-[#dd00ff]',
    icon: '🔥',
  },
  exercise: {
    color: 'text-[#ff003c]',
    glow: 'drop-shadow-[0_0_60px_rgba(255,0,60,1)] drop-shadow-[0_0_20px_rgba(255,0,60,0.8)]',
    bg: 'bg-[#180008]/90',
    border: 'border-[#ff003c]/20',
    badge: 'bg-[#0f0005]/95 text-[#ff003c] border-[#ff003c]/30',
    ringColor: '#ff003c',
    glowColor: 'bg-[#ff003c]',
    icon: '⚡',
  },
  rest: {
    color: 'text-[#7700ff]',
    glow: 'drop-shadow-[0_0_60px_rgba(119,0,255,1)] drop-shadow-[0_0_20px_rgba(119,0,255,0.8)]',
    bg: 'bg-[#080018]/90',
    border: 'border-[#7700ff]/20',
    badge: 'bg-[#04000f]/95 text-[#7700ff] border-[#7700ff]/30',
    ringColor: '#7700ff',
    glowColor: 'bg-[#7700ff]',
    icon: '💤',
  },
  cooldown: {
    color: 'text-[#1d5dfc]',
    glow: 'drop-shadow-[0_0_60px_rgba(29,93,252,1)] drop-shadow-[0_0_20px_rgba(29,93,252,0.8)]',
    bg: 'bg-[#00071a]/90',
    border: 'border-[#1d5dfc]/20',
    badge: 'bg-[#00071a]/95 text-[#1d5dfc] border-[#1d5dfc]/30',
    ringColor: '#1d5dfc',
    glowColor: 'bg-[#1d5dfc]',
    icon: '❄️',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type TimerState = 'idle' | 'running' | 'paused' | 'done';

export default function TimerClient({ routineId }: { routineId: string }) {
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);

  const [state, setState] = useState<TimerState>('idle');
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [tickAnim, setTickAnim] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(false);
  const startTimeRef = useRef<Date | null>(null);

  // Load routine
  useEffect(() => {
    const r = getRoutine(routineId);
    if (r) {
      setRoutine(r);
      const seq = buildSequence(r);
      setPhases(seq);
      if (seq.length > 0) setTimeLeft(seq[0].duration);
    }
  }, [routineId]);

  const currentPhase = phases[phaseIndex] ?? null;
  const cfg = currentPhase ? PHASE_CONFIG[currentPhase.type] : PHASE_CONFIG.warmup;

  // Progress for the ring
  const progress = currentPhase
    ? ((currentPhase.duration - timeLeft) / currentPhase.duration) * 100
    : 0;

  const circumference = 2 * Math.PI * 168; // r=168

  // Advance to next phase or finish
  const advancePhase = useCallback((nextIndex: number, allPhases: Phase[]) => {
    if (nextIndex >= allPhases.length) {
      setState('done');
      playComplete();
      return;
    }
    const next = allPhases[nextIndex];
    setPhaseIndex(nextIndex);
    setTimeLeft(next.duration);
    playSoundForPhase(next.type);
  }, []);

  // Timer tick
  useEffect(() => {
    if (state !== 'running') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        // Countdown tick sound for last 3 seconds
        if (prev <= 3 && prev > 1) {
          playCountdownTick();
          setTickAnim(true);
          setTimeout(() => setTickAnim(false), 300);
        }

        if (prev <= 1) {
          // Advance phase on next render cycle
          tickRef.current = true;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  // Watch for phase advancement
  useEffect(() => {
    if (tickRef.current && timeLeft === 0 && state === 'running') {
      tickRef.current = false;
      advancePhase(phaseIndex + 1, phases);
    }
  }, [timeLeft, state, phaseIndex, phases, advancePhase]);

  function start() {
    if (state === 'idle' && phases.length > 0) {
      startTimeRef.current = new Date();
      playSoundForPhase(phases[0].type);
    }
    setState('running');
  }

  function pause() {
    setState('paused');
  }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState('idle');
    setPhaseIndex(0);
    if (phases.length > 0) setTimeLeft(phases[0].duration);
  }

  function restart() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState('idle');
    setPhaseIndex(0);
    if (phases.length > 0) setTimeLeft(phases[0].duration);
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  function getWorkoutMeta() {
    const now = startTimeRef.current ?? new Date();
    const rounds = routine!.rounds ?? 1;
    const totalSecs =
      routine!.warmupDuration +
      rounds * routine!.exercises.length * routine!.exerciseDuration +
      rounds * Math.max(0, routine!.exercises.length - 1) * routine!.restDuration +
      Math.max(0, rounds - 1) * routine!.restDuration +
      routine!.cooldownDuration;
    const totalMin = Math.floor(totalSecs / 60);
    const totalSec = totalSecs % 60;
    return {
      dateStr: now.toISOString().split('T')[0],
      timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      totalLabel: totalMin > 0 ? `${totalMin}m ${totalSec}s` : `${totalSec}s`,
      rounds,
    };
  }

  function exportMarkdown() {
    if (!routine) return;
    const { dateStr, timeStr, totalLabel, rounds } = getWorkoutMeta();
    const lines = [
      '---',
      `title: "${routine.name}"`,
      `date: ${dateStr}`,
      `time: ${timeStr}`,
      `tags: [workout, hiit]`,
      `type: HIIT`,
      '---',
      '',
      `# ${routine.name}`,
      '',
      `**Date:** ${dateStr} at ${timeStr}  `,
      `**Total Time:** ${totalLabel}  `,
      `**Exercises:** ${routine.exercises.length}  `,
      `**Rounds:** ${rounds}  `,
      '',
      '## Workout Structure',
      '',
      '| Phase | Duration |',
      '| ----- | -------- |',
      ...(routine.warmupDuration > 0 ? [`| Warm Up | ${routine.warmupDuration}s |`] : []),
      `| Exercise | ${routine.exerciseDuration}s |`,
      `| Rest | ${routine.restDuration}s |`,
      ...(routine.cooldownDuration > 0 ? [`| Cool Down | ${routine.cooldownDuration}s |`] : []),
      '',
      '## Exercises',
      '',
      ...routine.exercises.map(ex => `- [x] ${ex.name}`),
      '',
      '## Notes',
      '',
      '_Add notes here..._',
      '',
    ];
    downloadFile(lines.join('\n'), `${dateStr} ${routine.name}.md`, 'text/markdown');
  }

  function exportCSV() {
    if (!routine) return;
    const { dateStr, rounds } = getWorkoutMeta();
    const rows = [
      ['Date', 'Routine', 'Round', 'Phase', 'Exercise', 'Duration (s)'],
      ...(routine.warmupDuration > 0
        ? [[dateStr, routine.name, '', 'Warm Up', '', String(routine.warmupDuration)]]
        : []),
      ...Array.from({ length: rounds }).flatMap((_, r) =>
        routine.exercises.map(ex => [
          dateStr, routine.name, String(r + 1), 'Exercise', ex.name, String(routine.exerciseDuration),
        ])
      ),
      ...(routine.cooldownDuration > 0
        ? [[dateStr, routine.name, '', 'Cool Down', '', String(routine.cooldownDuration)]]
        : []),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    downloadFile(csv, `${dateStr} ${routine.name}.csv`, 'text/csv');
  }

  function exportJSON() {
    if (!routine) return;
    const { dateStr, timeStr, totalLabel, rounds } = getWorkoutMeta();
    const data = {
      routine: routine.name,
      date: dateStr,
      time: timeStr,
      totalTime: totalLabel,
      rounds,
      warmupDuration: routine.warmupDuration,
      exerciseDuration: routine.exerciseDuration,
      restDuration: routine.restDuration,
      cooldownDuration: routine.cooldownDuration,
      exercises: routine.exercises.map(ex => ex.name),
    };
    downloadFile(JSON.stringify(data, null, 2), `${dateStr} ${routine.name}.json`, 'application/json');
  }

  function exportText() {
    if (!routine) return;
    const { dateStr, timeStr, totalLabel, rounds } = getWorkoutMeta();
    const lines = [
      `HIIT WORKOUT — ${routine.name}`,
      `Date: ${dateStr} at ${timeStr}`,
      `Total Time: ${totalLabel}  |  Rounds: ${rounds}`,
      '',
      'STRUCTURE',
      ...(routine.warmupDuration > 0 ? [`  Warm Up:    ${routine.warmupDuration}s`] : []),
      `  Exercise:   ${routine.exerciseDuration}s`,
      `  Rest:       ${routine.restDuration}s`,
      ...(routine.cooldownDuration > 0 ? [`  Cool Down:  ${routine.cooldownDuration}s`] : []),
      '',
      'EXERCISES',
      ...routine.exercises.map((ex, i) => `  ${i + 1}. ${ex.name}`),
    ];
    downloadFile(lines.join('\n'), `${dateStr} ${routine.name}.txt`, 'text/plain');
  }

  // Phase step indicators
  const totalExercises = routine?.exercises.length ?? 0;
  const currentExerciseNum = currentPhase?.type === 'exercise'
    ? Math.floor(phaseIndex / 2) + (routine?.warmupDuration ? 0 : 0)
    : null;

  if (!routine) {
    return (
      <div className="min-h-screen bg-[#010108] flex items-center justify-center">
        <p className="text-slate-500">Routine not found.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#010108] flex flex-col transition-colors duration-700`}>
      {/* Header */}
      <header className="border-b border-white/10 bg-[#08080f]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => { stop(); router.push('/'); }}
            className="p-2 rounded-xl hover:bg-white/8 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-slate-100 flex-1 truncate">{routine.name}</h1>
          <span className="text-xs text-slate-600">
            {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
            {(routine.rounds ?? 1) > 1 && ` · ${routine.rounds} rounds`}
          </span>
        </div>
      </header>

      {/* Phase progress bar */}
      <div className="flex h-1">
        {phases.map((p, i) => (
          <div
            key={i}
            className={`flex-1 transition-all duration-500 ${
              i < phaseIndex
                ? PHASE_CONFIG[p.type].color.replace('text-', 'bg-').replace('-400', '-600')
                : i === phaseIndex && state !== 'idle'
                ? PHASE_CONFIG[p.type].color.replace('text-', 'bg-').replace('-400', '-500')
                : 'bg-white/5'
            }`}
          />
        ))}
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-8">

        {/* Phase label */}
        {state !== 'done' && currentPhase && (
          <div className="text-center space-y-1.5">
            <span className={`inline-flex items-center gap-3 px-7 py-3 rounded-full border text-xl font-bold tracking-wide ${cfg.badge}`}>
              <span>{cfg.icon}</span>
              {currentPhase.type === 'warmup' ? 'Warm Up' :
               currentPhase.type === 'rest' ? (currentPhase.label === 'Rest' ? 'Rest' : `Next: Round ${currentPhase.label.replace('Round ', '')}`) :
               currentPhase.type === 'cooldown' ? 'Cool Down' :
               currentPhase.label}
            </span>
            {(routine.rounds ?? 1) > 1 && currentPhase.round && (
              <p className="text-xs text-slate-600 tracking-widest uppercase">
                Round {currentPhase.round} of {routine.rounds}
              </p>
            )}
          </div>
        )}

        {/* Done state */}
        {state === 'done' && (
          <div className="text-center space-y-2">
            <div className="text-6xl mb-1">🎉</div>
            <h2 className="text-3xl font-black text-slate-100">Workout Complete!</h2>
            <p className="text-slate-500 text-sm">Great work finishing {routine.name}</p>
          </div>
        )}

        {/* Timer ring */}
        {state !== 'done' && (
          <div className="relative flex items-center justify-center w-full max-w-[420px]">
            {/* Glow background */}
            <div className={`absolute w-[28rem] h-[28rem] rounded-full blur-[100px] opacity-30 transition-colors duration-700 ${cfg.glowColor}`} />

            <svg viewBox="0 0 420 420" className="w-full rotate-[-90deg]">
              {/* Track */}
              <circle
                cx="210" cy="210" r="168"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              {/* Progress */}
              <circle
                cx="210" cy="210" r="168"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                stroke={cfg.ringColor}
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * progress) / 100}
                style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.7s ease', filter: `drop-shadow(0 0 8px ${cfg.ringColor}) drop-shadow(0 0 16px ${cfg.ringColor})` }}
              />
            </svg>

            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`font-mono font-black tracking-tighter transition-colors duration-700 ${cfg.color} ${cfg.glow} ${
                  tickAnim ? 'tick-animate' : ''
                } ${state === 'paused' ? 'opacity-50' : ''}`}
                style={{ fontSize: 'clamp(2.5rem, 11vw, 4.5rem)', lineHeight: 1 }}
              >
                {formatTime(timeLeft)}
              </span>
              {state === 'paused' && (
                <span className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Paused</span>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          {state === 'done' ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              {/* Export dropdown */}
              <div className="relative w-full">
                <button
                  onClick={() => setShowExportMenu(v => !v)}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#dd00ff]/20 to-[#7700ff]/20 hover:from-[#dd00ff]/30 hover:to-[#7700ff]/30 border border-[#dd00ff]/40 hover:border-[#dd00ff]/60 text-[#dd00ff] font-bold transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                  <svg className={`w-4 h-4 ml-auto transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showExportMenu && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl border border-white/10 bg-[#0c0c14] overflow-hidden shadow-2xl z-10">
                    {[
                      { label: 'Markdown', sub: 'Obsidian / .md', icon: 'M', fn: exportMarkdown },
                      { label: 'CSV', sub: 'Spreadsheet / .csv', icon: ',', fn: exportCSV },
                      { label: 'JSON', sub: 'Structured data / .json', icon: '{}', fn: exportJSON },
                      { label: 'Plain Text', sub: 'Simple summary / .txt', icon: 'T', fn: exportText },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={opt.fn}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
                      >
                        <span className="w-8 h-8 rounded-lg bg-[#dd00ff]/15 border border-[#dd00ff]/20 text-[#dd00ff] text-xs font-black flex items-center justify-center shrink-0">
                          {opt.icon}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{opt.label}</p>
                          <p className="text-xs text-slate-600">{opt.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={restart}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/5 text-slate-300 font-semibold transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restart
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/5 text-slate-300 font-semibold transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stop */}
              <button
                onClick={stop}
                disabled={state === 'idle'}
                className="w-12 h-12 rounded-2xl border border-white/10 hover:bg-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                title="Stop"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>

              {/* Start / Pause */}
              {state === 'running' ? (
                <button
                  onClick={pause}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-xl shadow-purple-900/50 transition-all active:scale-95 flex items-center justify-center"
                  title="Pause"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={start}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xl shadow-blue-900/50 transition-all active:scale-95 flex items-center justify-center"
                  title="Start"
                >
                  <svg className="w-9 h-9 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}

              {/* Skip */}
              <button
                onClick={() => advancePhase(phaseIndex + 1, phases)}
                disabled={state === 'idle' || phaseIndex >= phases.length - 1}
                className="w-12 h-12 rounded-2xl border border-white/10 hover:bg-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                title="Skip to next phase"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </>
          )}
        </div>

      </main>
    </div>
  );
}

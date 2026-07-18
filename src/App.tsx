import { useEffect, useMemo, useRef, useState } from "react";
import { categories, categoryKey, categoryLabel, poolLabel } from "./categories";
import { figures } from "./data/figures";
import { dailyCategoryForDate, dailyQuestionsForDate } from "./lib/daily";
import { generateInfiniteQuestion, generateQuickSession, isCorrect } from "./lib/game";
import { sessionShareText, share } from "./lib/share";
import { clearDailyProgress, getDailyProgress, getDailyResult, getInfiniteBest, saveDailyProgress, saveDailyResult, saveInfiniteBest, saveQuickResult, type DailyProgress, type DailyResult } from "./lib/storage";
import type { CategoryId, Figure, Question } from "./types";
import "./styles.css";

type PlayMode = "quick" | "daily" | "infinite";

function modeFromHash(): PlayMode | null {
  const mode = window.location.hash.slice(1).split("/")[0];
  return mode === "quick" || mode === "daily" || mode === "infinite" ? mode : null;
}

function poolFromHash(): CategoryId[] {
  const pool = window.location.hash.slice(1).split("/")[1]?.split("+") ?? [];
  const valid = pool.filter((category): category is CategoryId => categories.some((candidate) => candidate.id === category));
  return valid.length > 0 ? valid : ["western-history"];
}

function categoryHasFigures(category: CategoryId): boolean {
  return figures.some((figure) => figure.category === category && figure.status === "active");
}

function isPlayablePool(pool: CategoryId[]): boolean {
  return figures.filter((figure) => pool.includes(figure.category) && figure.status === "active").length >= 20;
}

function localDateKey(): string {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function modeLabel(mode: PlayMode): string {
  if (mode === "daily") return "Daily Challenge";
  return mode === "infinite" ? "Infinite" : "Quick";
}

function Portrait({ figure }: { figure: Figure }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="portrait" aria-hidden="true">
      {!failed
        ? <img src={figure.image.url} alt="" onError={() => setFailed(true)} />
        : figure.displayName.split(" ").map((word) => word[0]).join("").slice(0, 2)}
    </div>
  );
}

function childLabel(count: number): string {
  return `${count} ${count === 1 ? "child" : "children"}`;
}

function FigureButton({ figure, onSelect, selected, correct, revealed, known = false }: {
  figure: Figure;
  onSelect: () => void;
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  known?: boolean;
}) {
  const resultClass = !revealed ? "" : correct ? " correct" : selected ? " incorrect" : "";
  const showCount = revealed || known;
  return (
    <button className={`figure-card${resultClass}`} disabled={revealed} onClick={onSelect} type="button">
      <Portrait figure={figure} />
      <span className="figure-name">{figure.displayName}</span>
      <span className="descriptor">{figure.descriptor}</span>
      {showCount ? <strong className="count">{childLabel(figure.childrenCount)}</strong> : <span className="hidden-count">Child count hidden</span>}
      {revealed && correct && <span className="result-mark">✓ More children</span>}
      {revealed && selected && !correct && <span className="result-mark">✕ Not this one</span>}
    </button>
  );
}

function Sources({ figures }: { figures: Figure[] }) {
  return (
    <section className="sources" aria-labelledby="sources-title">
      <h2 id="sources-title">Sources</h2>
      {figures.map((figure) => (
        <article key={figure.id} className="source-item">
          <h3>{figure.displayName}: {figure.childrenCount}</h3>
          <p>{figure.explanation}</p>
          <p className="rule">{figure.countingRuleSummary}</p>
          <p className="image-credit">Portrait: {figure.image.attribution} · <a href={figure.image.sourceUrl} target="_blank" rel="noreferrer">Wikimedia Commons ({figure.image.licence})</a></p>
          <ul>{figure.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
        </article>
      ))}
    </section>
  );
}

function Home({ start, pool, setPool }: { start: (mode: PlayMode, pool?: CategoryId[]) => void; pool: CategoryId[]; setPool: (pool: CategoryId[]) => void }) {
  const date = localDateKey();
  const dailyCategory = dailyCategoryForDate(date, figures);
  const dailyPreview = dailyQuestionsForDate(date, dailyCategory, figures)[0];
  const left = dailyPreview.left;
  const right = dailyPreview.right;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (moreOpen) moreCloseRef.current?.focus(); }, [moreOpen]);
  return (
    <div className="home-page">
      <header className="site-header site-shell">
        <button className="wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} type="button">Kiddle</button>
        <button aria-controls="about-dialog" aria-expanded={moreOpen} className="more-info" onClick={() => setMoreOpen(true)} type="button">More info</button>
      </header>

      <main className="site-shell home-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Today's theme · {categoryLabel(dailyCategory)}</p>
            <h1>Who had more children?</h1>
            <p>A daily trivia game with sourced answers.</p>
            <div className="play-stack">
              <button className="primary daily-action" onClick={() => start("daily")} type="button"><span><small>Daily Challenge</small><strong>Play today’s challenge</strong></span><span aria-hidden="true">→</span></button>
              <div className="alternate-modes">
                <div className="alternate-heading"><span>Other modes</span><details className="pool-menu"><summary>Pool · {pool.length === 0 ? "Choose" : pool.length === 1 ? categoryLabel(pool[0]) : `${pool.length} categories`}</summary><fieldset className="category-picker"><legend>Game pool</legend>{categories.filter((candidate) => categoryHasFigures(candidate.id)).map((candidate) => <label key={candidate.id}><input checked={pool.includes(candidate.id)} onChange={() => setPool(pool.includes(candidate.id) ? pool.filter((id) => id !== candidate.id) : [...pool, candidate.id])} type="checkbox" /> {candidate.label}</label>)}</fieldset></details></div>
                <div className="mode-choices"><button disabled={!isPlayablePool(pool)} onClick={() => start("quick", pool)} type="button"><strong>Quick</strong><span>10 questions</span></button><button disabled={!isPlayablePool(pool)} onClick={() => start("infinite", pool)} type="button"><strong>Infinite</strong><span>3 lives</span></button></div>
              </div>
            </div>
          </div>
          <div className="hero-showdown" aria-label="Example figure comparison">
            <div className="hero-person"><Portrait figure={left} /><strong>{left.displayName}</strong><span>{left.descriptor}</span></div>
            <div className="vs">VS</div>
            <div className="hero-person"><Portrait figure={right} /><strong>{right.displayName}</strong><span>{right.descriptor}</span></div>
            <p className="hero-question">Who had more children?</p>
          </div>
        </section>

        {moreOpen && <div className="about-backdrop" onKeyDown={(event) => { if (event.key === "Escape") setMoreOpen(false); }}>
          <section aria-labelledby="about-title" aria-modal="true" className="about-panel" id="about-dialog" role="dialog">
          <button aria-label="Close more information" className="about-close" onClick={() => setMoreOpen(false)} ref={moreCloseRef} type="button">×</button>
          <div className="section-heading"><p className="eyebrow">About Kiddle</p><h2 id="about-title">How the game works.</h2></div>
          <div className="about-copy"><section><h3>Make your pick</h3><p>Choose who had more children. Counts and sources appear after every answer.</p></section><section><h3>The Daily Challenge</h3><p>A new themed puzzle starts at midnight in your local time. Progress is saved on this device.</p></section><section><h3>About us</h3><p>Made by Bloin with the help of Codex.</p></section></div>
          </section>
        </div>}
      </main>
    </div>
  );
}

function Results({ answers, mode, restart, home, pool, dailyDate, isPractice = false }: { answers: boolean[]; mode: PlayMode; restart: () => void; home: () => void; pool: CategoryId[]; dailyDate?: string; isPractice?: boolean }) {
  const [notice, setNotice] = useState("");
  const score = answers.filter(Boolean).length;
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    const result = { score, completedAt: new Date().toISOString() };
    if (mode === "quick") saveQuickResult(categoryKey(pool), result);
    if (mode === "daily" && dailyDate && !isPractice) {
      saveDailyResult(categoryKey(pool), dailyDate, { ...result, answers });
      clearDailyProgress(categoryKey(pool), dailyDate);
    }
  }, [dailyDate, isPractice, mode, pool, score]);

  const onShare = async () => {
    try {
      const label = mode === "daily" && dailyDate ? `Daily ${dailyDate}` : modeLabel(mode);
      const outcome = await share(sessionShareText(label, poolLabel(pool), score, answers));
      setNotice(outcome === "copied" ? "Result copied to your clipboard." : "Share sheet opened.");
    } catch { setNotice("Could not share your result. Try again from a supported browser."); }
  };

  return (
    <main className="shell results">
      <p className="eyebrow">Kiddle {modeLabel(mode)}{isPractice ? " · Practice" : ""} · {poolLabel(pool)}</p>
      <h1>{score}/10</h1>
      <div className="answer-grid" aria-label={`${score} correct answers out of 10`}>{answers.map((correct, index) => <span key={index} aria-label={correct ? "Correct" : "Incorrect"}>{correct ? "🟩" : "🟥"}</span>)}</div>
      <button className="primary" onClick={onShare} type="button">Share spoiler-free result</button>
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className="secondary-actions">{mode !== "daily" && <button onClick={restart} type="button">Play again</button>}<button onClick={home} type="button">Return home</button></div>
    </main>
  );
}

function FixedGame({ mode, questions, restart, home, pool, dailyDate, isPractice = false, newDailyAvailable = false, initialProgress }: { mode: "quick" | "daily"; questions: Question[]; restart: () => void; home: () => void; pool: CategoryId[]; dailyDate?: string; isPractice?: boolean; newDailyAvailable?: boolean; initialProgress?: DailyProgress | null }) {
  const [index, setIndex] = useState(initialProgress?.index ?? 0);
  const [selectedId, setSelectedId] = useState<string | null>(initialProgress?.selectedFigureId ?? null);
  const [showSources, setShowSources] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>(initialProgress?.answers ?? []);
  const question: Question = questions[index];
  const revealed = selectedId !== null;
  useEffect(() => {
    if (mode === "daily" && dailyDate) saveDailyProgress(categoryKey(pool), dailyDate, { index, answers, selectedFigureId: selectedId });
  }, [answers, dailyDate, index, mode, pool, selectedId]);
  const choose = (figureId: string) => { if (!revealed) { setSelectedId(figureId); setAnswers((current) => [...current, isCorrect(question, figureId)]); } };

  if (index === questions.length) return <Results answers={answers} mode={mode} restart={restart} home={home} pool={pool} dailyDate={dailyDate} isPractice={isPractice} />;
  const winnerId = question.left.childrenCount > question.right.childrenCount ? question.left.id : question.right.id;
  const selectedCorrect = selectedId ? isCorrect(question, selectedId) : false;
  const score = answers.filter(Boolean).length;
  return (
    <main className="shell game">
      <header className="game-header">
        <button className="back" onClick={home} type="button">← Home</button>
        <div className="game-brand"><strong>Kiddle</strong><span>{modeLabel(mode)}{isPractice ? " · Practice" : ""} · {poolLabel(pool)}</span></div>
        <div className="game-status"><span>Question <strong>{index + 1}/10</strong></span><span>Score <strong>{score}</strong></span></div>
      </header>
      <div className="game-progress" aria-label={`${index} of ${questions.length} questions complete`} aria-valuemax={questions.length} aria-valuemin={0} aria-valuenow={index} role="progressbar"><span style={{ width: `${(index / questions.length) * 100}%` }} /></div>
      {newDailyAvailable && <div className="daily-notice" role="status">A new Daily Challenge is ready. <button onClick={restart} type="button">Start it</button></div>}
      <section className="game-prompt">
        <p className="eyebrow">Make your pick</p>
        <h1>Who had more children?</h1>
        <p className="instruction">Choose a figure. Counts stay hidden until you answer.</p>
      </section>
      <div className="figures"><FigureButton figure={question.left} onSelect={() => choose(question.left.id)} selected={selectedId === question.left.id} correct={winnerId === question.left.id} revealed={revealed} /><FigureButton figure={question.right} onSelect={() => choose(question.right.id)} selected={selectedId === question.right.id} correct={winnerId === question.right.id} revealed={revealed} /></div>
      {revealed && <section className={`reveal ${selectedCorrect ? "positive" : "negative"}`} aria-live="polite"><h2>{selectedCorrect ? "Correct" : "Incorrect"}</h2><p>{selectedCorrect ? "Nice call." : `${question.left.childrenCount > question.right.childrenCount ? question.left.displayName : question.right.displayName} had more children.`}</p><div className="reveal-actions"><button onClick={() => setShowSources((current) => !current)} type="button">{showSources ? "Hide sources" : "Show sources"}</button><button className="primary" onClick={() => { setIndex((current) => current + 1); setSelectedId(null); setShowSources(false); }} type="button">{index === questions.length - 1 ? "See results" : "Next question"}</button></div>{showSources && <Sources figures={[question.left, question.right]} />}</section>}
    </main>
  );
}

function QuickGame({ restart, home, pool }: { restart: () => void; home: () => void; pool: CategoryId[] }) {
  const poolFigures = figures.filter((figure) => pool.includes(figure.category));
  const questions = useMemo(() => generateQuickSession(poolFigures), [pool, poolFigures]);
  return <FixedGame mode="quick" questions={questions} restart={restart} home={home} pool={pool} />;
}

function DailyComplete({ date, result, home, pool }: { date: string; result: DailyResult; home: () => void; pool: CategoryId[] }) {
  const [notice, setNotice] = useState("");
  const onShare = async () => {
    try {
      const outcome = await share(sessionShareText(`Daily ${date}`, poolLabel(pool), result.score, result.answers ?? []));
      setNotice(outcome === "copied" ? "Result copied to your clipboard." : "Share sheet opened.");
    } catch { setNotice("Could not share your result. Try again from a supported browser."); }
  };
  return <main className="shell results"><p className="eyebrow">Daily Challenge · {poolLabel(pool)} · {date}</p><h1>Today’s puzzle is complete</h1><p>Great job. You scored <strong>{result.score}/10</strong>.</p><button className="primary" onClick={onShare} type="button">Share spoiler-free result</button>{notice && <p className="notice" role="status">{notice}</p>}<button onClick={home} type="button">Return home</button></main>;
}

function DailyGame({ restart, home }: { restart: () => void; home: () => void }) {
  const date = localDateKey();
  const category = dailyCategoryForDate(date, figures);
  const pool = [category];
  const questions = useMemo(() => dailyQuestionsForDate(date, category, figures), [category, date]);
  const result = getDailyResult(categoryKey(pool), date);
  const storedProgress = getDailyProgress(categoryKey(pool), date);
  const progress = storedProgress && (storedProgress.selectedFigureId === null || [questions[storedProgress.index].left.id, questions[storedProgress.index].right.id].includes(storedProgress.selectedFigureId)) ? storedProgress : null;
  const [newDailyAvailable, setNewDailyAvailable] = useState(false);

  useEffect(() => {
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 1, 0);
    const timer = window.setTimeout(() => setNewDailyAvailable(true), nextMidnight.getTime() - Date.now());
    return () => window.clearTimeout(timer);
  }, []);

  if (result) return <DailyComplete date={date} result={result} home={home} pool={pool} />;
  return <FixedGame mode="daily" questions={questions} restart={restart} home={home} pool={pool} dailyDate={date} initialProgress={progress} newDailyAvailable={newDailyAvailable} />;
}

function InfiniteGame({ restart, home, pool }: { restart: () => void; home: () => void; pool: CategoryId[] }) {
  const poolFigures = figures.filter((figure) => pool.includes(figure.category));
  const [question, setQuestion] = useState<Question | null>(() => generateInfiniteQuestion(poolFigures, new Set()));
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [runBest, setRunBest] = useState(0);
  const [personalBest, setPersonalBest] = useState(() => getInfiniteBest(categoryKey(pool)));
  const [finished, setFinished] = useState(false);
  const saved = useRef(false);

  const revealed = selectedId !== null;
  const gameOver = lives === 0 || finished;
  useEffect(() => {
    if (!gameOver || saved.current) return;
    saved.current = true;
    setPersonalBest(saveInfiniteBest(categoryKey(pool), runBest));
  }, [gameOver, pool, runBest]);

  if (!question) return <main className="shell results"><h1>More figures needed</h1><button className="primary" onClick={home} type="button">Return home</button></main>;

  const winnerId = question.left.childrenCount > question.right.childrenCount ? question.left.id : question.right.id;
  const selectedCorrect = selectedId ? isCorrect(question, selectedId) : false;
  const knownIds = new Set(seenIds);
  const choose = (figureId: string) => {
    if (revealed || gameOver) return;
    const correct = isCorrect(question, figureId);
    setSelectedId(figureId);
    if (correct) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setRunBest((best) => Math.max(best, nextStreak));
    } else {
      setLives((current) => current - 1);
      setStreak(0);
    }
  };
  const nextQuestion = () => {
    const nextSeen = new Set([...seenIds, question.left.id, question.right.id]);
    const next = generateInfiniteQuestion(poolFigures, nextSeen);
    setSeenIds([...nextSeen]);
    if (!next) {
      setFinished(true);
      return;
    }
    setQuestion(next);
    setSelectedId(null);
    setShowSources(false);
  };

  return (
    <main className="shell game">
      <header className="game-header">
        <button className="back" onClick={home} type="button">← Home</button>
        <div className="game-brand"><strong>Kiddle</strong><span>Infinite · {poolLabel(pool)}</span></div>
        <div className="game-status infinite-status"><span>Lives <strong className="lives" aria-label={`${lives} lives remaining`}>{"♥".repeat(lives)}</strong></span><span>Streak <strong>{streak}</strong></span><span>Best <strong>{personalBest}</strong></span></div>
      </header>
      <section className="game-prompt">
        <p className="eyebrow">Infinite Mode</p>
        <h1>Who had more children?</h1>
        <p className="instruction">Known count versus someone new.</p>
      </section>
      <div className="figures"><FigureButton figure={question.left} known={knownIds.has(question.left.id)} onSelect={() => choose(question.left.id)} selected={selectedId === question.left.id} correct={winnerId === question.left.id} revealed={revealed} /><FigureButton figure={question.right} known={knownIds.has(question.right.id)} onSelect={() => choose(question.right.id)} selected={selectedId === question.right.id} correct={winnerId === question.right.id} revealed={revealed} /></div>
      {revealed && !gameOver && <section className={`reveal ${selectedCorrect ? "positive" : "negative"}`} aria-live="polite"><h2>{selectedCorrect ? "Correct" : "Incorrect"}</h2><p>{selectedCorrect ? "Streak continues." : `${question.left.childrenCount > question.right.childrenCount ? question.left.displayName : question.right.displayName} had more children.`}</p><div className="reveal-actions"><button onClick={() => setShowSources((current) => !current)} type="button">{showSources ? "Hide sources" : "Show sources"}</button><button className="primary" onClick={nextQuestion} type="button">Next match</button></div>{showSources && <Sources figures={[question.left, question.right]} />}</section>}
      {gameOver && <div className="modal-backdrop"><section aria-labelledby="run-over-title" aria-modal="true" className="game-over" role="dialog"><p className="eyebrow">Infinite Mode</p><h2 id="run-over-title">{finished ? "Every figure seen" : "Run over"}</h2><p>{finished ? `You reached the end of the current ${poolLabel(pool)} pool.` : "Your three lives are gone."}</p><div className="run-stats"><span>Best streak <strong>{runBest}</strong></span><span>Personal best <strong>{personalBest}</strong></span></div><div className="reveal-actions"><button className="primary" onClick={restart} type="button">Play again</button><button onClick={home} type="button">Return home</button></div></section></div>}
    </main>
  );
}

export default function App() {
  const [mode, setMode] = useState<PlayMode | null>(modeFromHash);
  const [pool, setPool] = useState<CategoryId[]>(poolFromHash);
  const [gameKey, setGameKey] = useState(0);
  const start = (nextMode: PlayMode, nextPool = pool) => { window.location.hash = nextMode === "daily" ? nextMode : `${nextMode}/${categoryKey(nextPool)}`; if (nextMode !== "daily") setPool(nextPool); setGameKey((current) => current + 1); setMode(nextMode); };
  const restart = () => { if (mode) start(mode); };
  const home = () => { window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`); setMode(null); };
  if (!mode) return <Home start={start} pool={pool} setPool={setPool} />;
  if (mode === "infinite") return <InfiniteGame key={gameKey} restart={restart} home={home} pool={pool} />;
  if (mode === "daily") return <DailyGame key={gameKey} restart={restart} home={home} />;
  return <QuickGame key={gameKey} restart={restart} home={home} pool={pool} />;
}

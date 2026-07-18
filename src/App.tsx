import { useEffect, useMemo, useRef, useState } from "react";
import { categories, categoryLabel } from "./categories";
import { figures } from "./data/figures";
import { dailyQuestionsForDate } from "./lib/daily";
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

function categoryFromHash(): CategoryId {
  const category = window.location.hash.slice(1).split("/")[1];
  return categories.some((candidate) => candidate.id === category) ? category as CategoryId : "western-history";
}

function isPlayableCategory(category: CategoryId): boolean {
  return figures.filter((figure) => figure.category === category && figure.status === "active").length >= 20;
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

function Home({ start, category, setCategory }: { start: (mode: PlayMode, category: CategoryId) => void; category: CategoryId; setCategory: (category: CategoryId) => void }) {
  const left = figures.find((figure) => figure.id === "queen-victoria")!;
  const right = figures.find((figure) => figure.id === "george-washington")!;
  const date = localDateKey();
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <div className="home-page">
      <header className="site-header site-shell">
        <button className="wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} type="button">Kiddle</button>
        <button aria-expanded={moreOpen} className="more-info" onClick={() => setMoreOpen((current) => !current)} type="button">{moreOpen ? "Close info" : "More info"}</button>
      </header>

      <main className="site-shell home-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">The family-fact daily game</p>
            <h1>Who had more children?</h1>
            <p>A daily trivia game with sourced answers.</p>
            <label className="category-picker">Category <select value={category} onChange={(event) => setCategory(event.target.value as CategoryId)}>{categories.map((candidate) => <option disabled={!isPlayableCategory(candidate.id)} key={candidate.id} value={candidate.id}>{candidate.label}{isPlayableCategory(candidate.id) ? "" : " · In research"}</option>)}</select></label>
            <div className="hero-actions">
              <button className="primary" onClick={() => start("daily", category)} type="button">Play today’s challenge <span>→</span></button>
              <button className="text-button" onClick={() => start("quick", category)} type="button">Or play Quick Mode</button>
            </div>
          </div>
          <div className="hero-showdown" aria-label="Example figure comparison">
            <div className="hero-person"><Portrait figure={left} /><strong>{left.displayName}</strong><span>British monarch</span></div>
            <div className="vs">VS</div>
            <div className="hero-person"><Portrait figure={right} /><strong>{right.displayName}</strong><span>U.S. president</span></div>
            <p className="hero-question">Who had more children?</p>
          </div>
        </section>

        {moreOpen && <section className="about-panel" aria-labelledby="about-title">
          <div className="section-heading"><p className="eyebrow">About the game</p><h2 id="about-title">A quick game, with sources.</h2></div>
          <div className="mode-grid">
            <article className="mode-card featured-mode">
              <p className="mode-kicker">Recommended · {date}</p><h3>Daily Challenge</h3>
              <p>One shared 10-question format designed for a short daily ritual.</p>
              <div className="mode-stats"><span>10 questions</span><span>Shareable</span></div>
              <button className="primary" onClick={() => start("daily", category)} type="button">Play today’s challenge</button>
            </article>
            <article className="mode-card">
              <p className="mode-kicker">Play whenever</p><h3>Quick Mode</h3>
              <p>A fresh ten-question {categoryLabel(category)} run, with no repeats inside a session.</p>
              <div className="mode-stats"><span>10 questions</span><span>Fresh mix</span><span>Saved locally</span></div>
              <button className="secondary" onClick={() => start("quick", category)} type="button">Play Quick</button>
            </article>
            <article className="mode-card">
              <p className="mode-kicker">Three lives</p><h3>Infinite Mode</h3>
              <p>Keep a streak alive by matching a known count against someone new.</p>
              <div className="mode-stats"><span>3 lives</span><span>Personal best</span></div>
              <button className="secondary" onClick={() => start("infinite", category)} type="button">Play Infinite</button>
            </article>
          </div>
          <div className="trust-strip">
            <article><strong>01</strong><div><h3>Pick a figure</h3><p>Every card is a direct answer button—no extra controls.</p></div></article>
            <article><strong>02</strong><div><h3>See the evidence</h3><p>Counts, sources, and portrait credits appear only after you answer.</p></div></article>
            <article><strong>03</strong><div><h3>Share spoiler-free</h3><p>Results make a compact grid with no names or answers exposed.</p></div></article>
          </div>
        </section>}
      </main>
    </div>
  );
}

function Results({ answers, mode, restart, home, category, dailyDate, isPractice = false }: { answers: boolean[]; mode: PlayMode; restart: () => void; home: () => void; category: CategoryId; dailyDate?: string; isPractice?: boolean }) {
  const [notice, setNotice] = useState("");
  const score = answers.filter(Boolean).length;
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    const result = { score, completedAt: new Date().toISOString() };
    if (mode === "quick") saveQuickResult(category, result);
    if (mode === "daily" && dailyDate && !isPractice) {
      saveDailyResult(category, dailyDate, result);
      clearDailyProgress(category, dailyDate);
    }
  }, [category, dailyDate, isPractice, mode, score]);

  const onShare = async () => {
    try {
      const label = mode === "daily" && dailyDate ? `Daily ${dailyDate}` : modeLabel(mode);
      const outcome = await share(sessionShareText(label, categoryLabel(category), score, answers));
      setNotice(outcome === "copied" ? "Result copied to your clipboard." : "Share sheet opened.");
    } catch { setNotice("Could not share your result. Try again from a supported browser."); }
  };

  return (
    <main className="shell results">
      <p className="eyebrow">Kiddle {modeLabel(mode)}{isPractice ? " · Practice" : ""} · {categoryLabel(category)}</p>
      <h1>{score}/10</h1>
      <div className="answer-grid" aria-label={`${score} correct answers out of 10`}>{answers.map((correct, index) => <span key={index} aria-label={correct ? "Correct" : "Incorrect"}>{correct ? "🟩" : "🟥"}</span>)}</div>
      <button className="primary" onClick={onShare} type="button">Share spoiler-free result</button>
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className="secondary-actions">{mode !== "daily" && <button onClick={restart} type="button">Play again</button>}<button onClick={home} type="button">Return home</button></div>
    </main>
  );
}

function FixedGame({ mode, questions, restart, home, category, dailyDate, isPractice = false, newDailyAvailable = false, initialProgress }: { mode: "quick" | "daily"; questions: Question[]; restart: () => void; home: () => void; category: CategoryId; dailyDate?: string; isPractice?: boolean; newDailyAvailable?: boolean; initialProgress?: DailyProgress | null }) {
  const [index, setIndex] = useState(initialProgress?.index ?? 0);
  const [selectedId, setSelectedId] = useState<string | null>(initialProgress?.selectedFigureId ?? null);
  const [showSources, setShowSources] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>(initialProgress?.answers ?? []);
  const question: Question = questions[index];
  const revealed = selectedId !== null;
  useEffect(() => {
    if (mode === "daily" && dailyDate) saveDailyProgress(category, dailyDate, { index, answers, selectedFigureId: selectedId });
  }, [answers, category, dailyDate, index, mode, selectedId]);
  const choose = (figureId: string) => { if (!revealed) { setSelectedId(figureId); setAnswers((current) => [...current, isCorrect(question, figureId)]); } };

  if (index === questions.length) return <Results answers={answers} mode={mode} restart={restart} home={home} category={category} dailyDate={dailyDate} isPractice={isPractice} />;
  const winnerId = question.left.childrenCount > question.right.childrenCount ? question.left.id : question.right.id;
  const selectedCorrect = selectedId ? isCorrect(question, selectedId) : false;
  const score = answers.filter(Boolean).length;
  return (
    <main className="shell game">
      <header className="game-header">
        <button className="back" onClick={home} type="button">← Home</button>
        <div className="game-brand"><strong>Kiddle</strong><span>{modeLabel(mode)}{isPractice ? " · Practice" : ""} · {categoryLabel(category)}</span></div>
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

function QuickGame({ restart, home, category }: { restart: () => void; home: () => void; category: CategoryId }) {
  const categoryFigures = figures.filter((figure) => figure.category === category);
  const questions = useMemo(() => generateQuickSession(categoryFigures), [category, categoryFigures]);
  return <FixedGame mode="quick" questions={questions} restart={restart} home={home} category={category} />;
}

function DailyComplete({ date, result, home, category }: { date: string; result: DailyResult; home: () => void; category: CategoryId }) {
  return <main className="shell results"><p className="eyebrow">Daily Challenge · {categoryLabel(category)} · {date}</p><h1>Today’s puzzle is complete</h1><p>Great job. You scored <strong>{result.score}/10</strong>.</p><button className="primary" onClick={home} type="button">Return home</button></main>;
}

function DailyGame({ restart, home, category }: { restart: () => void; home: () => void; category: CategoryId }) {
  const date = localDateKey();
  const categoryFigures = figures.filter((figure) => figure.category === category);
  const questions = useMemo(() => dailyQuestionsForDate(date, category, categoryFigures), [category, categoryFigures, date]);
  const result = getDailyResult(category, date);
  const storedProgress = getDailyProgress(category, date);
  const progress = storedProgress && (storedProgress.selectedFigureId === null || [questions[storedProgress.index].left.id, questions[storedProgress.index].right.id].includes(storedProgress.selectedFigureId)) ? storedProgress : null;
  const [newDailyAvailable, setNewDailyAvailable] = useState(false);

  useEffect(() => {
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 1, 0);
    const timer = window.setTimeout(() => setNewDailyAvailable(true), nextMidnight.getTime() - Date.now());
    return () => window.clearTimeout(timer);
  }, []);

  if (result) return <DailyComplete date={date} result={result} home={home} category={category} />;
  return <FixedGame mode="daily" questions={questions} restart={restart} home={home} category={category} dailyDate={date} initialProgress={progress} newDailyAvailable={newDailyAvailable} />;
}

function InfiniteGame({ restart, home, category }: { restart: () => void; home: () => void; category: CategoryId }) {
  const categoryFigures = figures.filter((figure) => figure.category === category);
  const [question, setQuestion] = useState<Question | null>(() => generateInfiniteQuestion(categoryFigures, new Set()));
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [runBest, setRunBest] = useState(0);
  const [personalBest, setPersonalBest] = useState(() => getInfiniteBest(category));
  const [finished, setFinished] = useState(false);
  const saved = useRef(false);

  const revealed = selectedId !== null;
  const gameOver = lives === 0 || finished;
  useEffect(() => {
    if (!gameOver || saved.current) return;
    saved.current = true;
    setPersonalBest(saveInfiniteBest(category, runBest));
  }, [category, gameOver, runBest]);

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
    const next = generateInfiniteQuestion(categoryFigures, nextSeen);
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
        <div className="game-brand"><strong>Kiddle</strong><span>Infinite · {categoryLabel(category)}</span></div>
        <div className="game-status infinite-status"><span>Lives <strong className="lives" aria-label={`${lives} lives remaining`}>{"♥".repeat(lives)}</strong></span><span>Streak <strong>{streak}</strong></span><span>Best <strong>{personalBest}</strong></span></div>
      </header>
      <section className="game-prompt">
        <p className="eyebrow">Infinite Mode</p>
        <h1>Who had more children?</h1>
        <p className="instruction">Known count versus someone new.</p>
      </section>
      <div className="figures"><FigureButton figure={question.left} known={knownIds.has(question.left.id)} onSelect={() => choose(question.left.id)} selected={selectedId === question.left.id} correct={winnerId === question.left.id} revealed={revealed} /><FigureButton figure={question.right} known={knownIds.has(question.right.id)} onSelect={() => choose(question.right.id)} selected={selectedId === question.right.id} correct={winnerId === question.right.id} revealed={revealed} /></div>
      {revealed && !gameOver && <section className={`reveal ${selectedCorrect ? "positive" : "negative"}`} aria-live="polite"><h2>{selectedCorrect ? "Correct" : "Incorrect"}</h2><p>{selectedCorrect ? "Streak continues." : `${question.left.childrenCount > question.right.childrenCount ? question.left.displayName : question.right.displayName} had more children.`}</p><div className="reveal-actions"><button onClick={() => setShowSources((current) => !current)} type="button">{showSources ? "Hide sources" : "Show sources"}</button><button className="primary" onClick={nextQuestion} type="button">Next match</button></div>{showSources && <Sources figures={[question.left, question.right]} />}</section>}
      {gameOver && <div className="modal-backdrop"><section aria-labelledby="run-over-title" aria-modal="true" className="game-over" role="dialog"><p className="eyebrow">Infinite Mode</p><h2 id="run-over-title">{finished ? "Every figure seen" : "Run over"}</h2><p>{finished ? `You reached the end of the current ${categoryLabel(category)} set.` : "Your three lives are gone."}</p><div className="run-stats"><span>Best streak <strong>{runBest}</strong></span><span>Personal best <strong>{personalBest}</strong></span></div><div className="reveal-actions"><button className="primary" onClick={restart} type="button">Play again</button><button onClick={home} type="button">Return home</button></div></section></div>}
    </main>
  );
}

export default function App() {
  const [mode, setMode] = useState<PlayMode | null>(modeFromHash);
  const [category, setCategory] = useState<CategoryId>(categoryFromHash);
  const [gameKey, setGameKey] = useState(0);
  const start = (nextMode: PlayMode, nextCategory = category) => { window.location.hash = `${nextMode}/${nextCategory}`; setCategory(nextCategory); setGameKey((current) => current + 1); setMode(nextMode); };
  const restart = () => { if (mode) start(mode); };
  const home = () => { window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`); setMode(null); };
  if (!mode) return <Home start={start} category={category} setCategory={setCategory} />;
  if (mode === "infinite") return <InfiniteGame key={gameKey} restart={restart} home={home} category={category} />;
  if (mode === "daily") return <DailyGame key={gameKey} restart={restart} home={home} category={category} />;
  return <QuickGame key={gameKey} restart={restart} home={home} category={category} />;
}

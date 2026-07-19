import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { categories, categoryKey, categoryLabel, poolLabel } from "./categories";
import { figures } from "./data/figures";
import { dailyCategoryForDate, dailyQuestionsForDate } from "./lib/daily";
import { generateInfiniteQuestion, generateQuickSession, isCorrect } from "./lib/game";
import { infiniteShareText, sessionShareText, share } from "./lib/share";
import { buildGitHubIssueUrl, type ProblemType } from "./lib/report";
import { clearDailyProgress, getDailyProgress, getDailyResult, saveDailyProgress, saveDailyResult, saveQuickResult, type DailyProgress, type DailyResult } from "./lib/storage";
import { LanguageProvider, LanguageSelect, useLanguage } from "./i18n";
import type { CategoryId, Figure, Language, Question } from "./types";
import "./styles.css";

type PlayMode = "quick" | "daily" | "infinite";

const ReportContext = createContext<(type?: ProblemType, context?: string) => void>(() => undefined);

function ReportProvider({ children }: { children: ReactNode }) {
  const { text } = useLanguage();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ProblemType>("website");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [thanksOpen, setThanksOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const repository = import.meta.env.VITE_GITHUB_REPO?.trim();
  const issueUrl = buildGitHubIssueUrl(repository, type, description.trim(), window.location.href, context);
  const show = (nextType: ProblemType = "website", nextContext = "") => { setType(nextType); setContext(nextContext); setDescription(""); setOpen(true); };
  const close = () => setOpen(false);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!issueUrl || !description.trim()) return;
    window.open(issueUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
    setThanksOpen(true);
  };
  return <ReportContext.Provider value={show}>
    {children}
    <button className="report-fab" onClick={() => show()} type="button">{text.reportProblem}</button>
    {open && <div className="report-backdrop" onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
      <section aria-labelledby="report-title" aria-modal="true" className="report-dialog" role="dialog">
        <button aria-label={text.closeReport} className="report-close" onClick={close} ref={closeRef} type="button">×</button>
        <h2 id="report-title">{text.reportProblem}</h2>
        <form onSubmit={submit}>
          <fieldset><legend>{text.problemKind}</legend><label><input checked={type === "website"} name="problem-type" onChange={() => setType("website")} type="radio" /> {text.websiteProblem}</label><label><input checked={type === "data"} name="problem-type" onChange={() => setType("data")} type="radio" /> {text.dataProblem}</label></fieldset>
          <label className="report-description">{text.problemDescription}<textarea onChange={(event) => setDescription(event.target.value)} placeholder={type === "data" ? text.dataPrompt : text.websitePrompt} required rows={6} value={description} /></label>
          {!repository && <p className="report-config" role="status">{text.trackerNotConfigured}</p>}
          <div className="report-actions"><button className="primary" disabled={!repository || !description.trim()} type="submit">{text.sendReport}</button></div>
        </form>
      </section>
    </div>}
    {thanksOpen && <div className="report-backdrop"><section aria-labelledby="thanks-title" aria-modal="true" className="report-dialog report-thanks" role="dialog"><h2 id="thanks-title">{text.thankYou}</h2><p>{text.thankYouMessage}</p><div className="report-actions"><button autoFocus className="primary" onClick={() => setThanksOpen(false)} type="button">{text.done}</button></div></section></div>}
  </ReportContext.Provider>;
}

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

function categoryFigureCount(category: CategoryId): number {
  return figures.filter((figure) => figure.category === category && figure.status === "active").length;
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

function modeLabel(mode: PlayMode, language: Language = "en"): string {
  if (language === "zh") return mode === "daily" ? "每日挑战" : mode === "infinite" ? "无限模式" : "快速模式";
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

function childLabel(count: number, language: Language): string {
  return language === "zh" ? `${count} 个孩子` : `${count} ${count === 1 ? "child" : "children"}`;
}

function FigureButton({ figure, onSelect, selected, correct, revealed, known = false }: {
  figure: Figure;
  onSelect: () => void;
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  known?: boolean;
}) {
  const { language, text } = useLanguage();
  const resultClass = !revealed ? "" : correct ? " correct" : selected ? " incorrect" : "";
  const showCount = revealed || known;
  return (
    <button className={`figure-card${resultClass}`} disabled={revealed} onClick={onSelect} type="button">
      <Portrait figure={figure} />
      <span className="figure-name">{figure.displayName}</span>
      <span className="descriptor">{figure.descriptor}</span>
      {showCount ? <strong className="count">{childLabel(figure.childrenCount, language)}</strong> : <span aria-label={text.hiddenCount} className="hidden-count">?</span>}
      {revealed && correct && <span className="result-mark">✓ {text.moreChildren}</span>}
      {revealed && selected && !correct && <span className="result-mark">✕ {text.notThisOne}</span>}
    </button>
  );
}

function Sources({ figures }: { figures: Figure[] }) {
  const { text } = useLanguage();
  const report = useContext(ReportContext);
  return (
    <section className="sources" aria-labelledby="sources-title">
      <h2 id="sources-title">{text.sources}</h2>
      {figures.map((figure) => (
        <article key={figure.id} className="source-item">
          <h3>{figure.displayName}: {figure.childrenCount}</h3>
          <p>{figure.explanation}</p>
          <p className="rule">{figure.countingRuleSummary}</p>
          <p className="image-credit">{text.portrait}: {figure.image.attribution} · <a href={figure.image.sourceUrl} target="_blank" rel="noreferrer">Wikimedia Commons ({figure.image.licence})</a></p>
          <ul>{figure.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
        </article>
      ))}
      <button className="source-report" onClick={() => report("data", figures.map((figure) => figure.displayName).join(" and "))} type="button">{text.reportSource}</button>
    </section>
  );
}

function GameHeader({ home, label, children, tracker }: { home: () => void; label: string; children: ReactNode; tracker?: ReactNode }) {
  const { text } = useLanguage();
  return (
    <header className="game-header">
      <button className="back" onClick={home} type="button">← {text.home}</button>
      <div className="game-brand"><strong>Kiddle</strong><span>{label}</span><div className="game-status">{children}</div>{tracker}</div>
      <div className="game-tools"><LanguageSelect /></div>
    </header>
  );
}

function Home({ start, pool, setPool }: { start: (mode: PlayMode, pool?: CategoryId[]) => void; pool: CategoryId[]; setPool: (pool: CategoryId[]) => void }) {
  const { language, text } = useLanguage();
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
        <div className="site-actions"><LanguageSelect /><button aria-controls="about-dialog" aria-expanded={moreOpen} className="more-info" onClick={() => setMoreOpen(true)} type="button">{text.moreInfo}</button></div>
      </header>

      <main className="site-shell home-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{text.todayTheme} · {categoryLabel(dailyCategory, language)}</p>
            <h1>{text.title}</h1>
            <p>{text.tagline}</p>
            <div className="play-stack">
              <button className="primary daily-action" onClick={() => start("daily")} type="button"><span><small>{text.dailyChallenge}</small><strong>{text.playToday}</strong></span><span aria-hidden="true">→</span></button>
              <div className="alternate-modes">
                <div className="alternate-heading"><span>{text.otherModes}</span><details className="pool-menu"><summary>{text.pool} · {pool.length === 0 ? text.choose : pool.length === 1 ? categoryLabel(pool[0], language) : `${pool.length} ${text.categories}`}</summary><fieldset className="category-picker"><legend>{text.gamePool}</legend>{categories.filter((candidate) => categoryHasFigures(candidate.id)).map((candidate) => <label key={candidate.id}><input checked={pool.includes(candidate.id)} onChange={() => setPool(pool.includes(candidate.id) ? pool.filter((id) => id !== candidate.id) : [...pool, candidate.id])} type="checkbox" /> {categoryLabel(candidate.id, language)} ({categoryFigureCount(candidate.id)} {text.characters})</label>)}</fieldset></details></div>
                <div className="mode-choices"><button disabled={!isPlayablePool(pool)} onClick={() => start("quick", pool)} type="button"><strong>{text.quick}</strong><span>{text.tenQuestions}</span></button><button disabled={!isPlayablePool(pool)} onClick={() => start("infinite", pool)} type="button"><strong>{text.infinite}</strong><span>{text.threeLives}</span></button></div>
              </div>
            </div>
          </div>
          <div className="hero-showdown" aria-label={text.exampleComparison} data-label={language === "zh" ? "今日对决" : "TODAY'S PAIR"}>
            <div className="hero-person"><Portrait figure={left} /><strong>{left.displayName}</strong><span>{left.descriptor}</span></div>
            <div className="vs">VS</div>
            <div className="hero-person"><Portrait figure={right} /><strong>{right.displayName}</strong><span>{right.descriptor}</span></div>
            <p className="hero-question">{text.title}</p>
          </div>
        </section>

        {moreOpen && <div className="about-backdrop" onKeyDown={(event) => { if (event.key === "Escape") setMoreOpen(false); }}>
          <section aria-labelledby="about-title" aria-modal="true" className="about-panel" id="about-dialog" role="dialog">
          <button aria-label={text.closeInfo} className="about-close" onClick={() => setMoreOpen(false)} ref={moreCloseRef} type="button">×</button>
          <div className="section-heading"><p className="eyebrow">{text.aboutKiddle}</p><h2 id="about-title">{text.howItWorks}</h2></div>
          <div className="about-copy"><section><h3>{text.choosePerson}</h3><p>{text.help}</p></section><section><h3>{text.dailyChallenge}</h3><p>{text.dailyDescription}</p></section><section><h3>{text.aboutUs}</h3><p>{text.credit}</p></section></div>
          </section>
        </div>}
      </main>
    </div>
  );
}

function Results({ answers, mode, restart, home, pool, dailyDate, isPractice = false }: { answers: boolean[]; mode: PlayMode; restart: () => void; home: () => void; pool: CategoryId[]; dailyDate?: string; isPractice?: boolean }) {
  const { language, text } = useLanguage();
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
      const label = mode === "daily" && dailyDate ? `${text.dailyChallenge} ${dailyDate}` : modeLabel(mode, language);
      const outcome = await share(sessionShareText(label, poolLabel(pool, language), score, answers));
      setNotice(outcome === "copied" ? text.copied : text.shareOpened);
    } catch { setNotice(text.shareFailed); }
  };

  return (
    <main className="shell results">
      <p className="eyebrow">Kiddle {modeLabel(mode, language)}{isPractice ? ` · ${text.practice}` : ""} · {poolLabel(pool, language)}</p>
      <h1>{score}/10</h1>
      <div className="answer-grid" aria-label={language === "zh" ? `10 题中答对 ${score} 题` : `${score} correct answers out of 10`}>{answers.map((correct, index) => <span key={index} aria-label={correct ? text.correct : text.incorrect}>{correct ? "🟩" : "🟥"}</span>)}</div>
      <button className="primary" onClick={onShare} type="button">{text.shareResult}</button>
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className="secondary-actions">{mode !== "daily" && <button onClick={restart} type="button">{text.playAgain}</button>}<button onClick={home} type="button">{text.returnHome}</button></div>
    </main>
  );
}

function FixedGame({ mode, questions, restart, home, pool, dailyDate, isPractice = false, newDailyAvailable = false, initialProgress }: { mode: "quick" | "daily"; questions: Question[]; restart: () => void; home: () => void; pool: CategoryId[]; dailyDate?: string; isPractice?: boolean; newDailyAvailable?: boolean; initialProgress?: DailyProgress | null }) {
  const { language, text } = useLanguage();
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
      <section className="game-panel"><GameHeader home={home} label={`${modeLabel(mode, language)}${isPractice ? ` · ${text.practice}` : ""} · ${poolLabel(pool, language)}`} tracker={<div className="question-tracker" aria-label={language === "zh" ? `已完成 ${index}/${questions.length} 题` : `${index} of ${questions.length} questions complete`} aria-valuemax={questions.length} aria-valuemin={0} aria-valuenow={index} role="progressbar">{questions.map((item, trackerIndex) => <span aria-hidden="true" className={answers[trackerIndex] === true ? "correct-answer" : answers[trackerIndex] === false ? "wrong-answer" : trackerIndex === index ? "current" : ""} key={item.id} />)}</div>}><span>{text.question} <strong>{index + 1}/10</strong></span><span>{text.score} <strong>{score}</strong></span></GameHeader></section>
      {newDailyAvailable && <div className="daily-notice" role="status">{text.newDaily} <button onClick={restart} type="button">{text.startIt}</button></div>}
      <section className="game-prompt">
        <h1>{text.title}</h1>
      </section>
      <div className="figures"><FigureButton figure={question.left} onSelect={() => choose(question.left.id)} selected={selectedId === question.left.id} correct={winnerId === question.left.id} revealed={revealed} /><FigureButton figure={question.right} onSelect={() => choose(question.right.id)} selected={selectedId === question.right.id} correct={winnerId === question.right.id} revealed={revealed} /></div>
      {revealed && <section className={`reveal ${selectedCorrect ? "positive" : "negative"}`} aria-live="polite"><h2>{selectedCorrect ? text.correct : text.incorrect}</h2><p>{selectedCorrect ? text.niceCall : `${question.left.childrenCount > question.right.childrenCount ? question.left.displayName : question.right.displayName}${language === "zh" ? "" : " "}${text.hadMoreChildren}`}</p><div className="reveal-actions"><button onClick={() => setShowSources((current) => !current)} type="button">{showSources ? text.hideSources : text.showSources}</button><button className="primary" onClick={() => { setIndex((current) => current + 1); setSelectedId(null); setShowSources(false); }} type="button">{index === questions.length - 1 ? text.seeResults : text.nextQuestion}</button></div>{showSources && <Sources figures={[question.left, question.right]} />}</section>}
    </main>
  );
}

function QuickGame({ restart, home, pool }: { restart: () => void; home: () => void; pool: CategoryId[] }) {
  const poolFigures = figures.filter((figure) => pool.includes(figure.category));
  const questions = useMemo(() => generateQuickSession(poolFigures), [pool, poolFigures]);
  return <FixedGame mode="quick" questions={questions} restart={restart} home={home} pool={pool} />;
}

function DailyComplete({ date, result, home, pool }: { date: string; result: DailyResult; home: () => void; pool: CategoryId[] }) {
  const { language, text } = useLanguage();
  const [notice, setNotice] = useState("");
  const onShare = async () => {
    try {
      const outcome = await share(sessionShareText(`${text.dailyChallenge} ${date}`, poolLabel(pool, language), result.score, result.answers ?? []));
      setNotice(outcome === "copied" ? text.copied : text.shareOpened);
    } catch { setNotice(text.shareFailed); }
  };
  return <main className="shell results"><p className="eyebrow">{text.dailyChallenge} · {poolLabel(pool, language)} · {date}</p><h1>{text.todayComplete}</h1><p>{text.greatJob} <strong>{result.score}/10</strong>.</p><button className="primary" onClick={onShare} type="button">{text.shareResult}</button>{notice && <p className="notice" role="status">{notice}</p>}<button onClick={home} type="button">{text.returnHome}</button></main>;
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
  const { language, text } = useLanguage();
  const poolFigures = figures.filter((figure) => pool.includes(figure.category));
  const [question, setQuestion] = useState<Question | null>(() => generateInfiniteQuestion(poolFigures, new Set()));
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [lives, setLives] = useState(3);
  const [heartPopKey, setHeartPopKey] = useState(0);
  const [streak, setStreak] = useState(0);
  const [runBest, setRunBest] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [notice, setNotice] = useState("");

  const revealed = selectedId !== null;
  const gameOver = lives === 0 || finished;

  if (!question) return <main className="shell results"><h1>{text.moreFigures}</h1><button className="primary" onClick={home} type="button">{text.returnHome}</button></main>;

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
      setScore((current) => current + 1);
    } else {
      setHeartPopKey((current) => current + 1);
      setLives((current) => current - 1);
      setStreak(0);
    }
  };
  const onShare = async () => {
    try {
      const outcome = await share(infiniteShareText(poolLabel(pool, language), score, runBest, text.score, text.bestStreak));
      setNotice(outcome === "copied" ? text.copied : text.shareOpened);
    } catch { setNotice(text.shareFailed); }
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
      <section className="game-panel"><GameHeader home={home} label={`${text.infinite} · ${poolLabel(pool, language)}`}><span>{text.lives} <strong className="lives" aria-label={language === "zh" ? `剩余 ${lives} 条命` : `${lives} lives remaining`}>{"♥".repeat(lives)}{heartPopKey > 0 && <span aria-hidden="true" className="lost-heart" key={heartPopKey}>♥</span>}</strong></span><span>{text.streak} <strong>{streak}</strong></span><span>{text.score} <strong>{score}</strong></span></GameHeader></section>
      <section className="game-prompt">
        <h1>{text.title}</h1>
      </section>
      <div className="figures"><FigureButton figure={question.left} known={knownIds.has(question.left.id)} onSelect={() => choose(question.left.id)} selected={selectedId === question.left.id} correct={winnerId === question.left.id} revealed={revealed} /><FigureButton figure={question.right} known={knownIds.has(question.right.id)} onSelect={() => choose(question.right.id)} selected={selectedId === question.right.id} correct={winnerId === question.right.id} revealed={revealed} /></div>
      {revealed && !gameOver && <section className={`reveal ${selectedCorrect ? "positive" : "negative"}`} aria-live="polite"><h2>{selectedCorrect ? text.correct : text.incorrect}</h2><p>{selectedCorrect ? text.streakContinues : `${question.left.childrenCount > question.right.childrenCount ? question.left.displayName : question.right.displayName}${language === "zh" ? "" : " "}${text.hadMoreChildren}`}</p><div className="reveal-actions"><button onClick={() => setShowSources((current) => !current)} type="button">{showSources ? text.hideSources : text.showSources}</button><button className="primary" onClick={nextQuestion} type="button">{text.nextMatch}</button></div>{showSources && <Sources figures={[question.left, question.right]} />}</section>}
      {gameOver && <div className="modal-backdrop"><section aria-labelledby="run-over-title" aria-modal="true" className="game-over" role="dialog"><p className="eyebrow">{text.infiniteMode}</p><h2 id="run-over-title">{finished ? text.everySeen : text.runOver}</h2><p>{finished ? (language === "zh" ? `你已经看完目前${poolLabel(pool, language)}题库中的所有人物。` : `You reached the end of the current ${poolLabel(pool, language)} pool.`) : text.noLives}</p><div className="run-stats"><span>{text.score} <strong>{score}</strong></span><span>{text.bestStreak} <strong>{runBest}</strong></span></div><div className="reveal-actions"><button className="primary" onClick={onShare} type="button">{text.shareResult}</button><button onClick={restart} type="button">{text.playAgain}</button><button onClick={home} type="button">{text.returnHome}</button></div>{notice && <p className="notice" role="status">{notice}</p>}</section></div>}
    </main>
  );
}

function AppContent() {
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

export default function App() {
  return <LanguageProvider><ReportProvider><AppContent /></ReportProvider></LanguageProvider>;
}

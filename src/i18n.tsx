import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Language } from "./types";

const copy = {
  en: {
    home: "Home", language: "Language", moreInfo: "More info", todayTheme: "Today's theme", title: "Who had more children?",
    tagline: "A daily trivia game with sourced answers.", dailyChallenge: "Daily Challenge", playToday: "Play today’s challenge",
    otherModes: "Other modes", pool: "Pool", choose: "Choose", categories: "categories", gamePool: "Game pool", quick: "Quick",
    tenQuestions: "10 questions", infinite: "Infinite", threeLives: "3 lives", howToPlay: "How to play",
    help: "Pick the person with more children. Counts and sources appear after your answer.", aboutKiddle: "About Kiddle",
    howItWorks: "How the game works.", choosePerson: "Choose a person", dailyDescription: "A new themed puzzle starts at midnight in your local time. Progress is saved on this device.",
    aboutUs: "About us", credit: "Made by Bloin with the help of Codex.", closeInfo: "Close more information", exampleComparison: "Example figure comparison",
    question: "Question", score: "Score", lives: "Lives", streak: "Streak", best: "Best", practice: "Practice",
    newDaily: "A new Daily Challenge is ready.", startIt: "Start it", correct: "Correct", incorrect: "Incorrect", niceCall: "Nice call.",
    moreChildren: "More children", notThisOne: "Not this one", hiddenCount: "Child count hidden", showSources: "Show sources", hideSources: "Hide sources",
    nextQuestion: "Next question", nextMatch: "Next match", seeResults: "See results", sources: "Sources", portrait: "Portrait", hadMoreChildren: "had more children.",
    shareResult: "Share spoiler-free result", copied: "Result copied to your clipboard.", shareOpened: "Share sheet opened.", shareFailed: "Could not share your result. Try again from a supported browser.",
    playAgain: "Play again", returnHome: "Return home", todayComplete: "Today’s puzzle is complete", greatJob: "Great job. You scored",
    moreFigures: "More figures needed", infiniteMode: "Infinite Mode", streakContinues: "Streak continues.", everySeen: "Every figure seen", runOver: "Run over",
    noLives: "Your three lives are gone.", bestStreak: "Best streak", personalBest: "Personal best"
  },
  zh: {
    home: "主页", language: "语言", moreInfo: "更多信息", todayTheme: "今日主题", title: "谁的孩子更多？",
    tagline: "每天一道有可靠来源的趣味问答。", dailyChallenge: "每日挑战", playToday: "开始今日挑战",
    otherModes: "其他模式", pool: "题库", choose: "请选择", categories: "个类别", gamePool: "游戏题库", quick: "快速模式",
    tenQuestions: "10 题", infinite: "无限模式", threeLives: "3 条命", howToPlay: "玩法",
    help: "选择孩子更多的人物。作答后会显示人数和资料来源。", aboutKiddle: "关于 Kiddle",
    howItWorks: "游戏玩法", choosePerson: "选择人物", dailyDescription: "每天午夜（本地时间）更新一组主题题目，进度会保存在此设备上。",
    aboutUs: "关于我们", credit: "由 Bloin 与 Codex 协助制作。", closeInfo: "关闭更多信息", exampleComparison: "人物比较示例",
    question: "题目", score: "得分", lives: "生命", streak: "连续答对", best: "最佳", practice: "练习",
    newDaily: "新的每日挑战已经开始。", startIt: "开始", correct: "回答正确", incorrect: "回答错误", niceCall: "答得好！",
    moreChildren: "孩子更多", notThisOne: "不是这个", hiddenCount: "孩子人数未显示", showSources: "查看来源", hideSources: "隐藏来源",
    nextQuestion: "下一题", nextMatch: "下一组", seeResults: "查看结果", sources: "资料来源", portrait: "肖像", hadMoreChildren: "的孩子更多。",
    shareResult: "分享无剧透结果", copied: "结果已复制到剪贴板。", shareOpened: "分享窗口已打开。", shareFailed: "无法分享结果，请使用支持分享的浏览器重试。",
    playAgain: "再玩一次", returnHome: "返回主页", todayComplete: "今天的挑战已完成", greatJob: "太棒了！你的得分是",
    moreFigures: "需要更多人物资料", infiniteMode: "无限模式", streakContinues: "继续连胜！", everySeen: "所有人物都出现过了", runOver: "本轮结束",
    noLives: "三条命已经用完。", bestStreak: "本轮最佳", personalBest: "个人最佳"
  }
} as const;

type CopyKey = keyof typeof copy.en;
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; text: Record<CopyKey, string> } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => { try { return localStorage.getItem("kiddle:language") === "zh" ? "zh" : "en"; } catch { return "en"; } });
  useEffect(() => { try { localStorage.setItem("kiddle:language", language); } catch { /* Language still works when storage is blocked. */ } document.documentElement.lang = language === "zh" ? "zh-Hans" : "en"; }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, text: copy[language] }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

export function LanguageSelect() {
  const { language, setLanguage, text } = useLanguage();
  return <label className="language-select"><span>{text.language}</span><select aria-label={text.language} onChange={(event) => setLanguage(event.target.value as Language)} value={language}><option value="en">English</option><option value="zh">中文</option></select></label>;
}

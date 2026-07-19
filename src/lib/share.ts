export function sessionShareText(mode: string, category: string, score: number, answers: boolean[]): string {
  const grid = answers.map((answer) => (answer ? "🟩" : "🟥")).join("");
  return `Kiddle ${mode}\n${category}\n${score}/10\n\n${grid}\n\nhttps://kid-dle.vercel.app`;
}

export function infiniteShareText(category: string, score: number, bestStreak: number, scoreLabel: string, streakLabel: string): string {
  return `Kiddle Infinite\n${category}\n${scoreLabel}: ${score}\n${streakLabel}: ${bestStreak}\n\nhttps://kid-dle.vercel.app`;
}

export async function share(text: string): Promise<"shared" | "copied"> {
  if (navigator.share) { await navigator.share({ title: "Kiddle", text }); return "shared"; }
  await navigator.clipboard.writeText(text);
  return "copied";
}

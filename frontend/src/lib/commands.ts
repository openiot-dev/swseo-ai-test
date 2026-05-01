export type RobotCommand =
  | "sit"
  | "stand"
  | "lay"
  | "walk"
  | "bark"
  | "dance"
  | "spin"
  | "shake"
  | "jump"
  | "stop";

export const COMMAND_LABEL: Record<RobotCommand, string> = {
  sit: "앉기",
  stand: "기립",
  lay: "엎드리기",
  walk: "걷기",
  bark: "짖기",
  dance: "춤추기",
  spin: "회전",
  shake: "악수",
  jump: "점프",
  stop: "정지",
};

export function parseCommand(text: string): RobotCommand | null {
  if (!text) return null;
  const t = text.toLowerCase();

  if (/(엎드|누워|lay\s*down|lie\s*down)/i.test(text)) return "lay";
  if (/(앉아|앉기|sit)/i.test(text)) return "sit";
  if (/(일어나|일어서|기립|일어 서|stand\s*up|stand)/i.test(text)) return "stand";
  if (/(춤|댄스|dance)/i.test(text)) return "dance";
  if (/(회전|돌아|돌아봐|한 ?바퀴|spin|turn\s*around)/i.test(t)) return "spin";
  if (/(악수|손\b|손 ?줘|손 ?내|paw|shake\s*hand|shake)/i.test(text)) return "shake";
  if (/(점프|뛰어|뛰어봐|jump|hop)/i.test(text)) return "jump";
  if (/(짖|왈왈|멍멍|bark|woof)/i.test(text)) return "bark";
  if (/(걸어|이리|와봐|이리와|come\s*here|walk|come)/i.test(text)) return "walk";
  if (/(정지|멈춰|그만|스톱|쉬어|stop|halt)/i.test(text)) return "stop";

  return null;
}

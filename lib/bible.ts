// 성경 66권 이름·약칭 매핑 + 개역개정 본문 URL + 원고 속 성경구절 파서.

export const BSKOREA_BOOK_CODES: Record<number, string> = {
  1: "gen", 2: "exo", 3: "lev", 4: "num", 5: "deu", 6: "jos", 7: "jdg", 8: "rut",
  9: "1sa", 10: "2sa", 11: "1ki", 12: "2ki", 13: "1ch", 14: "2ch", 15: "ezr",
  16: "neh", 17: "est", 18: "job", 19: "psa", 20: "pro", 21: "ecc", 22: "sng",
  23: "isa", 24: "jer", 25: "lam", 26: "ezk", 27: "dan", 28: "hos", 29: "jol",
  30: "amo", 31: "oba", 32: "jon", 33: "mic", 34: "nam", 35: "hab", 36: "zep",
  37: "hag", 38: "zec", 39: "mal", 40: "mat", 41: "mrk", 42: "luk", 43: "jhn",
  44: "act", 45: "rom", 46: "1co", 47: "2co", 48: "gal", 49: "eph", 50: "php",
  51: "col", 52: "1th", 53: "2th", 54: "1ti", 55: "2ti", 56: "tit", 57: "phm",
  58: "heb", 59: "jas", 60: "1pe", 61: "2pe", 62: "1jn", 63: "2jn", 64: "3jn",
  65: "jud", 66: "rev",
};

export function gaeBibleUrl(book: number, chapter: number, version = "GAE") {
  const code = BSKOREA_BOOK_CODES[book] || "gen";
  return `https://www.bskorea.or.kr/bible/korbibReadpage.php?version=${version}&book=${code}&chap=${chapter}`;
}

interface BookDef {
  num: number;
  full: string;
  aliases: string[];
}

const BOOKS: BookDef[] = [
  { num: 1, full: "창세기", aliases: ["창", "창세"] },
  { num: 2, full: "출애굽기", aliases: ["출", "출애굽"] },
  { num: 3, full: "레위기", aliases: ["레", "레위"] },
  { num: 4, full: "민수기", aliases: ["민", "민수"] },
  { num: 5, full: "신명기", aliases: ["신", "신명"] },
  { num: 6, full: "여호수아", aliases: ["수", "여호수아"] },
  { num: 7, full: "사사기", aliases: ["삿", "사사"] },
  { num: 8, full: "룻기", aliases: ["룻"] },
  { num: 9, full: "사무엘상", aliases: ["삼상"] },
  { num: 10, full: "사무엘하", aliases: ["삼하"] },
  { num: 11, full: "열왕기상", aliases: ["왕상"] },
  { num: 12, full: "열왕기하", aliases: ["왕하"] },
  { num: 13, full: "역대상", aliases: ["대상"] },
  { num: 14, full: "역대하", aliases: ["대하"] },
  { num: 15, full: "에스라", aliases: ["스", "에스라"] },
  { num: 16, full: "느헤미야", aliases: ["느", "느헤미야"] },
  { num: 17, full: "에스더", aliases: ["에", "에스더"] },
  { num: 18, full: "욥기", aliases: ["욥"] },
  { num: 19, full: "시편", aliases: ["시"] },
  { num: 20, full: "잠언", aliases: ["잠"] },
  { num: 21, full: "전도서", aliases: ["전", "전도"] },
  { num: 22, full: "아가", aliases: ["아"] },
  { num: 23, full: "이사야", aliases: ["사", "이사야"] },
  { num: 24, full: "예레미야", aliases: ["렘", "예레미야"] },
  { num: 25, full: "예레미야애가", aliases: ["애", "애가"] },
  { num: 26, full: "에스겔", aliases: ["겔", "에스겔"] },
  { num: 27, full: "다니엘", aliases: ["단", "다니엘"] },
  { num: 28, full: "호세아", aliases: ["호", "호세아"] },
  { num: 29, full: "요엘", aliases: ["욜"] },
  { num: 30, full: "아모스", aliases: ["암", "아모스"] },
  { num: 31, full: "오바댜", aliases: ["옵", "오바댜"] },
  { num: 32, full: "요나", aliases: ["욘"] },
  { num: 33, full: "미가", aliases: ["미"] },
  { num: 34, full: "나훔", aliases: ["나"] },
  { num: 35, full: "하박국", aliases: ["합", "하박국"] },
  { num: 36, full: "스바냐", aliases: ["습", "스바냐"] },
  { num: 37, full: "학개", aliases: ["학"] },
  { num: 38, full: "스가랴", aliases: ["슥", "스가랴"] },
  { num: 39, full: "말라기", aliases: ["말", "말라기"] },
  { num: 40, full: "마태복음", aliases: ["마", "마태"] },
  { num: 41, full: "마가복음", aliases: ["막", "마가"] },
  { num: 42, full: "누가복음", aliases: ["눅", "누가"] },
  { num: 43, full: "요한복음", aliases: ["요", "요한복"] },
  { num: 44, full: "사도행전", aliases: ["행", "사도행전"] },
  { num: 45, full: "로마서", aliases: ["롬", "로마"] },
  { num: 46, full: "고린도전서", aliases: ["고전"] },
  { num: 47, full: "고린도후서", aliases: ["고후"] },
  { num: 48, full: "갈라디아서", aliases: ["갈", "갈라디아"] },
  { num: 49, full: "에베소서", aliases: ["엡", "에베소"] },
  { num: 50, full: "빌립보서", aliases: ["빌", "빌립보"] },
  { num: 51, full: "골로새서", aliases: ["골", "골로새"] },
  { num: 52, full: "데살로니가전서", aliases: ["살전"] },
  { num: 53, full: "데살로니가후서", aliases: ["살후"] },
  { num: 54, full: "디모데전서", aliases: ["딤전"] },
  { num: 55, full: "디모데후서", aliases: ["딤후"] },
  { num: 56, full: "디도서", aliases: ["딛", "디도"] },
  { num: 57, full: "빌레몬서", aliases: ["몬", "빌레몬"] },
  { num: 58, full: "히브리서", aliases: ["히", "히브리"] },
  { num: 59, full: "야고보서", aliases: ["약", "야고보"] },
  { num: 60, full: "베드로전서", aliases: ["벧전"] },
  { num: 61, full: "베드로후서", aliases: ["벧후"] },
  { num: 62, full: "요한일서", aliases: ["요일", "요한1서"] },
  { num: 63, full: "요한이서", aliases: ["요이", "요한2서"] },
  { num: 64, full: "요한삼서", aliases: ["요삼", "요한3서"] },
  { num: 65, full: "유다서", aliases: ["유"] },
  { num: 66, full: "요한계시록", aliases: ["계", "계시록", "요한계시"] },
];

const NAME_MAP = new Map<string, { num: number; full: string }>();
BOOKS.forEach((b) => {
  NAME_MAP.set(b.full, { num: b.num, full: b.full });
  b.aliases.forEach((a) => NAME_MAP.set(a, { num: b.num, full: b.full }));
});

export function bookNumToName(num: number): string {
  return BOOKS.find((b) => b.num === num)?.full ?? "";
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 긴 이름 우선 매칭
const NAMES_SORTED = Array.from(NAME_MAP.keys()).sort(
  (a, b) => b.length - a.length,
);
const REF_RE = new RegExp(
  `(?<![가-힣A-Za-z])(${NAMES_SORTED.map(escapeRe).join("|")})\\s*(\\d+)\\s*[:장]\\s*(\\d+)(?:\\s*[-~∼]\\s*(\\d+))?\\s*절?`,
  "g",
);

export interface BibleRef {
  book: number;
  full: string;
  chapter: number;
  from: number;
  to: number;
  label: string; // 예: "요한복음 3:16-18"
}

// 텍스트에서 성경구절 참조를 모두 찾는다 (책 장:절[-절] / 책 장장 절절)
export function parseReferences(text: string): BibleRef[] {
  const out: BibleRef[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  REF_RE.lastIndex = 0;
  while ((m = REF_RE.exec(text)) !== null) {
    const info = NAME_MAP.get(m[1]);
    if (!info) continue;
    const chapter = Number(m[2]);
    const from = Number(m[3]);
    const to = m[4] ? Number(m[4]) : from;
    if (!chapter || !from || to < from) continue;
    const label =
      to > from
        ? `${info.full} ${chapter}:${from}-${to}`
        : `${info.full} ${chapter}:${from}`;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ book: info.num, full: info.full, chapter, from, to, label });
  }
  return out;
}

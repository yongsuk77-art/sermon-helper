// 설교 원고(.docx)를 읽어, 본문 속 성경구절을 찾아 개역개정 본문을
// 네모 박스로 삽입한 새 .docx 를 만든다. 원본 서식은 최대한 보존한다.
import JSZip from "jszip";
import { parseReferences, type BibleRef } from "./bible";

interface Verse {
  n: number;
  text: string;
}

const FONT =
  '<w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕" w:hAnsi="맑은 고딕"/>';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

// 한 문단(<w:p>)의 텍스트를 <w:t> 조각을 이어붙여 복원 (런 분할 대응)
function paragraphText(pXml: string): string {
  let text = "";
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pXml)) !== null) text += unescapeXml(m[1]);
  return text;
}

// 절 범위 슬라이스 (최대 40절로 제한)
function sliceVerses(verses: Verse[], from: number, to: number): Verse[] {
  return verses
    .filter((v) => v.n >= from && v.n <= to)
    .sort((a, b) => a.n - b.n)
    .slice(0, 40);
}

// 개역개정 본문 박스(<w:p>) 생성
function buildBox(ref: BibleRef, verses: Verse[] | null): string {
  const border = ["top", "left", "bottom", "right"]
    .map(
      (side) =>
        `<w:${side} w:val="single" w:sz="12" w:space="6" w:color="9A7322"/>`,
    )
    .join("");
  const pPr =
    `<w:pPr><w:pBdr>${border}</w:pBdr>` +
    `<w:shd w:val="clear" w:color="auto" w:fill="FBF7EC"/>` +
    `<w:spacing w:before="120" w:after="120" w:line="288" w:lineRule="auto"/>` +
    `<w:ind w:left="140" w:right="140"/></w:pPr>`;

  let runs =
    `<w:r><w:rPr>${FONT}<w:b/><w:color w:val="9A7322"/><w:sz w:val="20"/></w:rPr>` +
    `<w:t xml:space="preserve">[${escapeXml(ref.label)}] </w:t></w:r>`;

  const slice = verses ? sliceVerses(verses, ref.from, ref.to) : [];
  if (slice.length === 0) {
    runs +=
      `<w:r><w:rPr>${FONT}<w:i/><w:color w:val="B00020"/><w:sz w:val="18"/></w:rPr>` +
      `<w:t xml:space="preserve">본문을 불러오지 못했습니다.</w:t></w:r>`;
  } else {
    for (const v of slice) {
      runs +=
        `<w:r><w:rPr>${FONT}<w:b/><w:color w:val="9A7322"/><w:sz w:val="16"/></w:rPr>` +
        `<w:t xml:space="preserve">${v.n} </w:t></w:r>`;
      runs +=
        `<w:r><w:rPr>${FONT}<w:sz w:val="20"/></w:rPr>` +
        `<w:t xml:space="preserve">${escapeXml(v.text)} </w:t></w:r>`;
    }
    runs +=
      `<w:r><w:rPr>${FONT}<w:i/><w:color w:val="9A9A9A"/><w:sz w:val="14"/></w:rPr>` +
      `<w:t xml:space="preserve"> (개역개정)</w:t></w:r>`;
  }
  return `<w:p>${pPr}${runs}</w:p>`;
}

export interface ManuscriptResult {
  blob: Blob;
  insertedLabels: string[]; // 삽입된 구절
  failedLabels: string[]; // 본문을 못 가져온 구절
}

const PARA_RE = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;

export async function processManuscript(
  file: File | ArrayBuffer,
  onProgress?: (msg: string) => void,
): Promise<ManuscriptResult> {
  const log = (m: string) => onProgress?.(m);

  log("원고 파일을 여는 중…");
  const zip = await JSZip.loadAsync(file);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("워드 문서 형식이 아닙니다 (.docx 로 저장해 주세요).");
  const xml = await docFile.async("string");

  // 1) 문서 전체에서 참조 수집
  const allRefs: BibleRef[] = [];
  let mm: RegExpExecArray | null;
  PARA_RE.lastIndex = 0;
  while ((mm = PARA_RE.exec(xml)) !== null) {
    const t = paragraphText(mm[0]);
    if (t) allRefs.push(...parseReferences(t));
  }
  if (allRefs.length === 0) {
    throw new Error(
      "원고에서 성경구절을 찾지 못했습니다. (예: 요한복음 3:16 형식으로 적혀 있어야 합니다.)",
    );
  }
  log(`성경구절 ${new Set(allRefs.map((r) => r.label)).size}개 발견. 개역개정 본문을 불러오는 중…`);

  // 2) 필요한 장(chapter)만 한 번씩 개역개정 본문을 가져온다
  const chapKeys = Array.from(
    new Set(allRefs.map((r) => `${r.book}:${r.chapter}`)),
  );
  const chapMap = new Map<string, Verse[] | null>();
  for (const key of chapKeys) {
    const [b, c] = key.split(":");
    try {
      const res = await fetch(`/api/verses?book=${b}&chap=${c}`);
      if (!res.ok) throw new Error("fetch");
      const data = (await res.json()) as { verses: Verse[] };
      chapMap.set(key, data.verses);
    } catch {
      chapMap.set(key, null);
    }
  }

  // 3) 각 문단 뒤에 해당 구절 박스를 삽입
  const inserted: string[] = [];
  const failed: string[] = [];
  const newXml = xml.replace(PARA_RE, (pXml) => {
    const t = paragraphText(pXml);
    if (!t) return pXml;
    const refs = parseReferences(t);
    if (refs.length === 0) return pXml;
    let boxes = "";
    for (const r of refs) {
      const verses = chapMap.get(`${r.book}:${r.chapter}`);
      boxes += buildBox(r, verses ?? null);
      if (verses && sliceVerses(verses, r.from, r.to).length > 0)
        inserted.push(r.label);
      else failed.push(r.label);
    }
    return pXml + boxes;
  });

  log("새 워드 문서를 만드는 중…");
  zip.file("word/document.xml", newXml);
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return {
    blob,
    insertedLabels: Array.from(new Set(inserted)),
    failedLabels: Array.from(new Set(failed)),
  };
}

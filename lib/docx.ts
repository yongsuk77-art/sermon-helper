// 마크다운(설교 연구 결과) → 워드(.docx) 변환.
// 워드가 인코딩 창 없이 바로 열도록 진짜 Open XML 문서를 만든다.
// 우리 프롬프트가 내보내는 요소(제목, 굵게/기울임, 목록, 표, 인용구, 구분선)를 지원.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";

interface InlineBase {
  bold?: boolean;
  italics?: boolean;
  color?: string;
}

// ── 인라인 파싱: **굵게**, *기울임*, `코드` (토글 방식이라 중첩에도 안전) ──
function parseInline(text: string, base: InlineBase = {}): TextRun[] {
  const runs: TextRun[] = [];
  let buf = "";
  let bold = false;
  let italic = false;
  let code = false;

  const flush = () => {
    if (buf) {
      runs.push(
        new TextRun({
          text: buf,
          bold: base.bold || bold || undefined,
          italics: base.italics || italic || undefined,
          color: base.color,
          font: code ? "Consolas" : undefined,
        }),
      );
      buf = "";
    }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "*" && text[i + 1] === "*") {
      flush();
      bold = !bold;
      i++;
      continue;
    }
    if (ch === "*") {
      flush();
      italic = !italic;
      continue;
    }
    if (ch === "`") {
      flush();
      code = !code;
      continue;
    }
    buf += ch;
  }
  flush();
  if (runs.length === 0) runs.push(new TextRun({ text: "", bold: base.bold }));
  return runs;
}

const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  return splitRow(line).every((c) => /^:?-{1,}:?$/.test(c.replace(/\s/g, "")));
}

const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };

function buildTable(rows: string[]): Table {
  const parsed = rows.map(splitRow);
  const sepIdx = rows.findIndex(isSeparatorRow);
  const headerCells = sepIdx > 0 ? parsed[sepIdx - 1] : parsed[0];
  const bodyRows = parsed.filter((_, idx) =>
    sepIdx >= 0 ? idx > sepIdx : idx > 0,
  );
  const cols = Math.max(headerCells.length, ...bodyRows.map((r) => r.length), 1);

  const makeCell = (text: string, header: boolean) =>
    new TableCell({
      width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
      shading: header ? { fill: "F3EFE6" } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new Paragraph({ children: parseInline(text, { bold: header }) })],
    });

  const rowsOut: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: Array.from({ length: cols }, (_, c) =>
        makeCell(headerCells[c] ?? "", true),
      ),
    }),
  ];
  for (const r of bodyRows) {
    rowsOut.push(
      new TableRow({
        children: Array.from({ length: cols }, (_, c) =>
          makeCell(r[c] ?? "", false),
        ),
      }),
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: TABLE_BORDER,
      bottom: TABLE_BORDER,
      left: TABLE_BORDER,
      right: TABLE_BORDER,
      insideHorizontal: TABLE_BORDER,
      insideVertical: TABLE_BORDER,
    },
    rows: rowsOut,
  });
}

function blocksFromMarkdown(md: string): (Paragraph | Table)[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: (Paragraph | Table)[] = [];

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "") continue;

    // 표 블록
    if (t.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      i--;
      if (tableLines.length >= 1) out.push(buildTable(tableLines));
      continue;
    }

    // 구분선
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      out.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "DDDDDD", space: 1 },
          },
          spacing: { after: 120 },
        }),
      );
      continue;
    }

    // 제목
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      out.push(
        new Paragraph({
          heading: HEADINGS[h[1].length - 1],
          spacing: { before: 200, after: 80 },
          children: parseInline(h[2]),
        }),
      );
      continue;
    }

    // 인용구
    const bq = t.match(/^>\s?(.*)$/);
    if (bq) {
      out.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 60 },
          children: parseInline(bq[1], { italics: true, color: "555555" }),
        }),
      );
      continue;
    }

    // 글머리표 목록
    const bullet = t.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      out.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: parseInline(bullet[1]),
        }),
      );
      continue;
    }

    // 번호 목록 (번호는 글자로 유지)
    const num = t.match(/^(\d+\.)\s+(.*)$/);
    if (num) {
      out.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 40 },
          children: parseInline(`${num[1]} ${num[2]}`),
        }),
      );
      continue;
    }

    // 일반 문단
    out.push(
      new Paragraph({ spacing: { after: 80 }, children: parseInline(t) }),
    );
  }

  if (out.length === 0) out.push(new Paragraph(""));
  return out;
}

export async function markdownToDocxBlob(
  markdown: string,
  title: string,
): Promise<Blob> {
  const doc = new Document({
    title,
    styles: {
      default: {
        document: { run: { font: "맑은 고딕", size: 22 } }, // 11pt
      },
    },
    sections: [{ children: blocksFromMarkdown(markdown) }],
  });
  return Packer.toBlob(doc);
}

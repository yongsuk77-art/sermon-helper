// 대한성서공회에서 개역개정(GAE) 한 장을 가져와 절 단위로 파싱해 돌려준다.
// 출처: 대한성서공회 (개역개정). 원고에 삽입하는 본문은 항상 개역개정으로 표기.
import { NextRequest, NextResponse } from "next/server";
import { gaeBibleUrl } from "@/lib/bible";

export const runtime = "nodejs";
export const revalidate = 86400; // 하루 캐시 (성서공회 서버 부담 최소화)

function parseGae(html: string) {
  const start = html.indexOf('id="tdBible1"');
  if (start < 0) return null;
  const bodyStart = html.indexOf(">", start) + 1;
  let seg = html.slice(bodyStart);

  const ends = [
    seg.indexOf('<div style="width:100%;text-align: center">'),
    seg.indexOf('<div class="rightCont"'),
    seg.search(/<script/i),
    seg.search(/<\/td>/i),
  ].filter((i) => i >= 0);
  if (ends.length > 0) seg = seg.slice(0, Math.min(...ends));

  seg = seg.replace(/<[^>]*$/, "");
  seg = seg.replace(/<script[\s\S]*?<\/script>/gi, "");
  seg = seg.replace(/<div id='D_[\s\S]*?<\/div>/g, "");
  seg = seg.replace(/<a class=comment[\s\S]*?<\/a>/g, "");
  seg = seg.replace(/<a href="#none"[\s\S]*?<\/a>/g, "");

  const strip = (s: string) =>
    s
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

  const verses: { n: number; text: string }[] = [];
  const re =
    /<span class="number">(\d+)[^<]*<\/span>([\s\S]*?)(?=<span class="number">|$)/g;
  let v: RegExpExecArray | null;
  while ((v = re.exec(seg)) !== null) {
    const text = strip(v[2]);
    if (text) verses.push({ n: Number(v[1]), text });
  }
  return { verses };
}

export async function GET(req: NextRequest) {
  const book = Number(req.nextUrl.searchParams.get("book"));
  const chap = Number(req.nextUrl.searchParams.get("chap"));
  if (!book || book < 1 || book > 66 || !chap || chap < 1 || chap > 176) {
    return NextResponse.json({ error: "bad params" }, { status: 400 });
  }
  try {
    const res = await fetch(gaeBibleUrl(book, chap, "GAE"), {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("upstream");
    const parsed = parseGae(await res.text());
    if (!parsed || parsed.verses.length === 0) throw new Error("parse");
    return NextResponse.json(parsed, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}

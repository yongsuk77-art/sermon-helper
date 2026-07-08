import { MODES, type ModeId, type SermonContext } from "./types";

function optionalLine(label: string, value?: string) {
  return value?.trim() ? `- ${label}: ${value.trim()}` : "";
}

function contextSummary(ctx: SermonContext) {
  return [
    `- 본문: ${ctx.passage.trim()}`,
    optionalLine("주제/방향", ctx.theme),
    optionalLine("청중", ctx.audience),
    optionalLine("절기/상황", ctx.occasion),
    optionalLine("메모", ctx.notes),
  ]
    .filter(Boolean)
    .join("\n");
}

const WORKSHEETS: Record<ModeId, string> = {
  original: `## 1. 본문을 직접 읽으며 관찰하기
- 반복되는 단어/표현:
- 접속사, 명령형, 대조, 원인과 결과:
- 본문 분위기와 흐름:

## 2. 원어 확인 후보
| 절 | 단어 | 원어 확인 | 의미 범위 | 설교 연결점 |
|---|---|---|---|---|
|   |   |   |   |   |

## 3. 문법과 구조 메모
- 문장의 주어/동사/목적어:
- 강조되는 시제나 어법:
- 해석을 바꿀 수 있는 문법 포인트:

## 4. 확인할 자료
- 원어 성경/사전:
- 주요 주석:
- 번역본 대조:`,

  insight: `## 1. 본문의 중심 메시지
- 하나님은 어떤 분으로 드러나는가?
- 인간의 현실은 어떻게 드러나는가?
- 복음의 소망은 어디에 있는가?

## 2. 그리스도 중심 연결
- 이 본문은 그리스도의 인격/사역/복음과 어떻게 연결되는가?
- 억지 연결을 피하기 위해 확인할 점:

## 3. 묵상 질문
1. 이 본문이 먼저 내게 책망하거나 위로하는 것은?
2. 청중이 오해하기 쉬운 지점은?
3. 오늘 공동체가 순종할 한 가지는?

## 4. 적용 초안
- 개인:
- 가정/공동체:
- 세상 속 증언:`,

  translations: `## 1. 번역 대조 표
| 절 | 개역개정 | 새번역/공동번역 | 영어 번역 | 차이 메모 |
|---|---|---|---|---|
|   |   |   |   |   |

## 2. 차이를 관찰할 질문
- 단어 선택이 다른 곳은?
- 문장 구조가 다른 곳은?
- 해석상 의미가 달라질 수 있는 곳은?

## 3. 설교 반영
- 어느 번역이 본문 흐름을 가장 선명하게 돕는가?
- 설교 중 번역 차이를 설명해야 할 부분:
- 청중에게 혼란을 줄 수 있는 표현:`,

  jewish: `## 1. 역사/문화 배경
- 본문의 시대적 배경:
- 유대 관습, 절기, 성전/회당, 율법과 관련된 요소:
- 1세기 청중이라면 어떻게 들었을까?

## 2. 유대 문헌 확인 후보
- 구약 병행 본문:
- 제2성전기 배경:
- 랍비 문헌이나 전승 확인 필요:

## 3. PaRDeS 관찰
- Peshat, 문자적 의미:
- Remez, 암시/연결:
- Derash, 강해/적용:
- Sod, 신비적 읽기의 경계:

## 4. 기독교 설교에서의 사용
- 배경이 본문 이해를 돕는 지점:
- 지나친 추측을 피해야 할 지점:`,

  commentary: `## 1. 문맥 자리
- 책 전체 구조 안에서 위치:
- 앞뒤 단락과의 연결:
- 저자/수신자/상황:

## 2. 본문 구조
| 단락 | 절 | 핵심 내용 | 해석 메모 |
|---|---|---|---|
|   |   |   |   |

## 3. 절별 주석 메모
- 중요한 단어:
- 배경/문법:
- 신학적 쟁점:
- 설교에 꼭 필요한 설명:

## 4. 핵심 강조
- 반드시 말해야 할 것:
- 말하지 않아도 되는 것:
- 추가 확인이 필요한 것:`,

  outline: `## 설교 제목 후보
1.
2.
3.

## 중심 사상
- 본문이 말하는 한 문장:

## 서론
- 청중의 현실과 연결되는 질문/장면:
- 본문으로 들어가는 연결 문장:

## 본론
### 1.
- 본문 근거:
- 설명:
- 적용:

### 2.
- 본문 근거:
- 설명:
- 적용:

### 3.
- 본문 근거:
- 설명:
- 적용:

## 결론
- 복음적 초대:
- 결단/위로:

## 마침 기도
-`,
};

export function buildWorksheet(mode: ModeId, ctx: SermonContext) {
  const meta = MODES.find((m) => m.id === mode);
  return `# ${meta?.icon ?? ""} ${meta?.label ?? "설교 준비 워크시트"} - 무료 워크시트

> AI를 호출하지 않고 만든 준비 양식입니다. 빈칸을 직접 채우고, 필요할 때만 AI 보강을 사용하세요.

${contextSummary(ctx)}

---

${WORKSHEETS[mode]}`;
}

export function buildWorksheetSet(ctx: SermonContext) {
  return MODES.reduce<Partial<Record<ModeId, string>>>((acc, mode) => {
    acc[mode.id] = buildWorksheet(mode.id, ctx);
    return acc;
  }, {});
}

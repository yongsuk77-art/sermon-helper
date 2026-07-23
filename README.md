# 설교 준비 어시스트

성경 본문을 정확히 이해하고, 교회의 설교 유산과 신학적 통찰을 비판적으로 참고하며, 오늘의 삶에 구체적으로 적용하도록 돕는 Next.js 웹 앱입니다. 모든 AI 결과는 참고 초안이며 설교자의 성경·원문·주석·원출처 확인을 전제로 합니다.

## 연결형 6단계 연구

각 단계는 앞 단계 결과를 전달받습니다. 서로 무관한 여섯 답변을 만드는 대신, 주해가 신학과 적용을 통과해 하나의 설교로 이어지고 마지막 단계에서 다시 검증됩니다.

1. **본문 해석 · 원문** — 단락 경계, 문맥, 구조, 핵심 원어와 형태 분석, 번역 차이, 본문비평, 역사·문화 배경
2. **신학 · 복음 · 통찰** — 하나님과 인간, 성경신학, 그리스도와 복음, 교리적 견해 차이, 설교자의 묵상
3. **설교자 · 고전 · 교회사** — 교부, 종교개혁자, 청교도, 근현대 강해자를 작품·설교 출처 중심으로 비교
4. **삶 · 목회 적용** — 청중의 욕망·두려움·상처를 살피고 은혜에서 개인·가정·교회·일터의 순종으로 연결
5. **설교 설계 · 개요** — 본문/설교 중심 문장, 목적, 시간 배분, 본문을 따르는 흐름, 전환, 예화, 결론, 기도
6. **본문 충실도 · 최종 검토** — 문맥, 원어, 신학, 출처, 적용, 전달을 채점하고 위험도별 수정안 제시

## 정확성과 출처를 위한 장치

- 원어의 형태 분석·의미 범위·문맥상 의미를 분리하고 어원/어근/시제 과장을 금지하는 프롬프트
- 확실하지 않은 주장을 `[출처 확인 필요]`로 분리하고 서지정보·URL·인용문을 만들지 않도록 하는 출처 정책
- 설교 유산 화면에서 검증된 공개 자료실 바로가기와 본문 검색어 복사 제공
  - [Spurgeon Library Scripture Index](https://www.spurgeon.org/sermons/scripture/)
  - [MLJ Trust Sermons](https://www.mljtrust.org/sermons/)
  - [Gospel in Life Sermons](https://gospelinlife.com/sermons/)
  - [Christian Classics Ethereal Library](https://www.ccel.org/)
  - [TGC Scripture Index](https://www.thegospelcoalition.org/scripture/)
  - [Monergism Scripture Library](https://www.monergism.com/topics/sermon-manuscripts-mp3s-scripture)
- 마지막 최종 검토에서 인물·작품·설교·인용을 `확인 가능 / 확인 필요 / 삭제 권장`으로 감사
- 청중의 현실, 신학 전통, 참고할 설교자, 설교 시간을 연구 컨텍스트에 반영

## 기타 기능

- AI 없는 6단계 직접 연구 워크시트
- 작업 방식 선택: 기본은 AI 없이 무료 워크시트, 필요할 때만 Claude Opus 4.8 / Sonnet 5 / Haiku 4.5, GPT, Gemini로 보강
- 연구 결과를 이어받는 자유 질문
- 브라우저 자동 저장, JSON 백업/복원, 이전 1.x 연구 자동 이관
- 항목별 또는 전체 Word 문서 내보내기
- 기존 Word 설교 원고의 성경구절 표기를 찾아 개역개정 본문 박스 삽입
- PWA 설치와 Cloudflare OpenNext 배포 설정

## 로컬 실행

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

Cloudflare Workers로 미리보기/배포할 때는 `.dev.vars.example`을 `.dev.vars`로 복사해 사용하세요.

| 환경 변수 | 설명 | 기본값 |
|---|---|---|
| `ANTHROPIC_API_KEY` | (선택) Claude 사용 시. https://console.anthropic.com 에서 발급 | — |
| `SERMON_MODEL` | 기본 Claude 모델 | `claude-opus-4-8` |
| `SERMON_EFFORT` | 추론 깊이 `low`/`medium`/`high`/`xhigh` | `high` |
| `OPENAI_API_KEY` | (선택) GPT 사용 시. https://platform.openai.com | — |
| `OPENAI_MODEL` | (선택) OpenAI 모델 | `gpt-4o` |
| `GEMINI_API_KEY` | (선택) Gemini 사용 시. https://aistudio.google.com/app/apikey | — |
| `GEMINI_MODEL` | (선택) Gemini 모델 | `gemini-3.5-flash` |

앱 상단의 **작업 방식** 드롭다운은 기본값이 **AI 없이 기본값**입니다. 이 모드는 API 키와 비용 없이 무료 워크시트를 만듭니다. Claude·GPT·Gemini를 쓰려면 원하는 제공자의 키를 환경 변수에 추가하고 드롭다운에서 선택하세요. 모든 키는 **서버에서만** 쓰이며 브라우저에 노출되지 않습니다.

## 확인 명령

```bash
npm run lint
npm run build
npm run cf:build
```

## Vercel 배포

1. 저장소를 가져온 뒤 **Root Directory** 를 `sermon-helper` 또는 현재 앱 루트로 지정합니다.
2. AI 없이 쓰려면 환경 변수 없이 배포해도 됩니다.
3. Claude를 쓰려면 **Project Settings → Environment Variables** 에 `ANTHROPIC_API_KEY`를 추가하고, 필요하면 `SERMON_MODEL=claude-opus-4-8` 또는 `SERMON_MODEL=claude-sonnet-5`를 추가합니다.
4. GPT를 쓰려면 `OPENAI_API_KEY`, Gemini를 쓰려면 `GEMINI_API_KEY`를 추가합니다.
5. 환경 변수를 바꾼 뒤에는 반드시 **Redeploy** 해야 새 키가 적용됩니다.

401 `invalid x-api-key`가 나오면 Vercel에 저장된 API 키가 비어 있거나 잘못된 것입니다. 새 키로 교체하고 Redeploy 하세요. 앱은 AI 연결이 실패해도 결과 칸을 에러로 멈추지 않고 무료 워크시트로 자동 전환합니다.

## 중요한 사용 원칙

AI가 제시한 원어 파싱, 사본 정보, 고전/설교 제목, 직접 인용, 사건과 통계는 반드시 종이 성경 또는 신뢰할 수 있는 원문 판본·사전·주석·원출처로 확인하십시오. 다른 설교자의 통찰은 자기 목소리로 소화하고, 저작권이 있는 표현과 구조를 그대로 사용하지 마십시오.

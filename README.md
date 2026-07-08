# 📖 설교 준비 도우미 (Sermon Helper)

설교자를 위한 **본문 연구 도구**입니다. 성경 본문 하나만 입력하면, 설교 준비에 필요한 여섯 가지 분석을 순서대로 받아볼 수 있습니다. 웹과 휴대폰(홈 화면 설치)에서 자유롭게 사용하도록 만든 독립 앱입니다.

> 토다 커뮤니티 앱과는 **완전히 분리된** 별도 프로젝트입니다 (`sermon-helper/` 디렉토리).

## ✨ 기능

본문을 입력하면 다음을 **설교 준비 순서대로** 생성합니다.

1. **📜 원어 분석 · 파싱** — 히브리어/헬라어 단어별 분해, 어형(파싱) 표, 핵심 단어 의미와 어근
2. **🕊️ 영적 통찰** — 그리스도 중심 해석, 핵심 주제, 묵상 질문, 적용의 씨앗
3. **📖 번역본 비교** — 개역개정·새번역·공동번역·NIV·ESV·KJV·원문 직역 대조와 차이 분석
4. **✡️ 유대적 관점** — 미드라쉬·탈무드·타르굼, PaRDeS(페샤트·레메즈·드라쉬·소드), 제2성전기 배경
5. **🗂️ 주석 · 강해** — 본문 구조, 절별 주석, 역사·문법적 해석, 신학적 종합
6. **✍️ 설교 개요** — 제목, 중심 사상, 서론, 대지, 예화, 적용, 결론, 마침 기도

추가로:

- **📄 원고 성경구절 삽입** — 설교 원고(.docx)를 올리면 본문 속 성경구절(예: 요한복음 3:16)을 찾아 개역개정 본문을 네모 박스로 삽입해 새 워드로 내려받기 (원본 서식 유지, 출처: 대한성서공회)
- **🤖 AI 선택** — 상단에서 분석 AI를 골라 사용 (Claude Opus 4.8 / Sonnet 4.6 / Haiku 4.5, GPT, Gemini). 같은 본문을 여러 AI로 비교 가능
- **💬 자유 질문** — 본문에 대해 무엇이든 묻고 답을 받는 기능
- **한 번에 전체 준비** — 여섯 항목을 순서대로 한꺼번에 생성
- **자동 저장 · 기록** — 연구 내용이 기기에 저장되어 다시 열람 가능
- **복사 · 내려받기(.md)** — 항목별/전체 마크다운으로 내보내기
- **PWA** — 휴대폰 "홈 화면에 추가"로 앱처럼 설치

## 🛠️ 기술 스택

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Claude API (`@anthropic-ai/sdk`, 기본 모델 `claude-opus-4-8`, 스트리밍)
- 결과 저장: 브라우저 localStorage (기기별)
- PWA: manifest + service worker

## 🚀 로컬 실행

```bash
cd sermon-helper
npm install
cp .env.local.example .env.local   # 그리고 ANTHROPIC_API_KEY 입력
npm run dev
# http://localhost:3000
```

`.env.local` 설정:

| 변수 | 설명 | 기본값 |
|---|---|---|
| `ANTHROPIC_API_KEY` | **필수.** Claude용. https://console.anthropic.com 에서 발급 | — |
| `SERMON_MODEL` | 기본 Claude 모델 | `claude-opus-4-8` |
| `SERMON_EFFORT` | 추론 깊이 `low`/`medium`/`high` | `high` |
| `OPENAI_API_KEY` | (선택) GPT 사용 시. https://platform.openai.com | — |
| `OPENAI_MODEL` | (선택) OpenAI 모델 | `gpt-4o` |
| `GEMINI_API_KEY` | (선택) Gemini 사용 시. https://aistudio.google.com/app/apikey | — |
| `GEMINI_MODEL` | (선택) Gemini 모델 | `gemini-1.5-pro` |

앱 상단의 **AI 선택** 드롭다운에서 Claude(세 버전)·GPT·Gemini를 고를 수 있습니다. GPT·Gemini를 쓰려면 해당 키를 환경 변수에 추가하세요(없으면 그 AI 선택 시 안내 메시지가 나옵니다). 모든 키는 **서버에서만** 쓰이며 브라우저에 노출되지 않습니다.

## ☁️ 배포 (Vercel 권장)

이 앱은 저장소 루트가 아니라 `sermon-helper/` 하위에 있습니다. Vercel에서 새 프로젝트를 만들 때:

1. 저장소를 가져온 뒤 **Root Directory** 를 `sermon-helper` 로 지정
2. 환경 변수에 `ANTHROPIC_API_KEY`(필수) 추가
3. 배포 → 발급된 주소를 휴대폰/PC에서 접속, 「홈 화면에 추가」로 설치

> 긴 분석을 끝까지 받으려면 함수 실행 시간이 넉넉한 플랜(예: Vercel Pro)이 좋습니다. `route.ts`의 `maxDuration`은 300초로 설정돼 있습니다.

## ⚠️ 사용 안내

이 도구의 분석은 설교 준비를 돕는 **참고 자료**입니다. 원어·번역·문헌 인용 등 중요한 내용은 표준 자료로 한 번 더 확인하시고, 최종 해석과 적용은 설교자의 분별에 따르시기 바랍니다.

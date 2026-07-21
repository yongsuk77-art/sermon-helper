export interface ResearchSource {
  name: string;
  era: string;
  description: string;
  url: string;
  domain: string;
}

// 공개 웹에서 실제 Scripture/sermon index가 확인된 연구 출발점.
// 특정 전통의 해석을 정답으로 삼지 않고 원출처를 찾아 대조하는 데 사용한다.
export const RESEARCH_SOURCES: ResearchSource[] = [
  {
    name: "Spurgeon Library",
    era: "19세기 설교",
    description: "찰스 스펄전 설교를 성경 권·장별로 찾는 공식 Scripture Index",
    url: "https://www.spurgeon.org/sermons/scripture/",
    domain: "spurgeon.org",
  },
  {
    name: "MLJ Trust",
    era: "20세기 강해",
    description: "마틴 로이드존스의 1,600편 이상 강해 설교 공식 아카이브",
    url: "https://www.mljtrust.org/sermons/",
    domain: "mljtrust.org",
  },
  {
    name: "Gospel in Life",
    era: "현대 복음 설교",
    description: "팀 켈러의 설교를 본문·주제·시리즈별로 탐색하는 공식 자료실",
    url: "https://gospelinlife.com/sermons/",
    domain: "gospelinlife.com",
  },
  {
    name: "CCEL",
    era: "교부·고전",
    description: "교부, 종교개혁자, 청교도, 고전 주석을 본문과 저자별로 찾는 공개 도서관",
    url: "https://www.ccel.org/",
    domain: "ccel.org",
  },
  {
    name: "TGC Scripture Index",
    era: "현대 자료",
    description: "성경 권·장별 설교와 글을 탐색하는 Scripture Index",
    url: "https://www.thegospelcoalition.org/scripture/",
    domain: "thegospelcoalition.org",
  },
  {
    name: "Monergism Scripture Library",
    era: "개혁파 자료",
    description: "성경 본문별 설교 원고, 오디오, 고전 강해를 모은 색인",
    url: "https://www.monergism.com/topics/sermon-manuscripts-mp3s-scripture",
    domain: "monergism.com",
  },
];

export function sourceSearchText(source: ResearchSource, passage: string) {
  return `site:${source.domain} \"${passage.trim()}\" sermon`;
}

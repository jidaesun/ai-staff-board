// 글 말투·용어·구성 검사와, 자료 조사에서 확인되지 않은 가격·모델명 검사.
// 의존성 없이 node --test 로 바로 실행할 수 있게 다른 파일을 import 하지 않습니다.

// 소제목 줄 표기. 프롬프트와 검사가 같은 값을 씁니다.
export const HEADING_MARK = "■";
// 첫 등장 때 바로 뒤에 괄호 풀이가 있어야 하는 어려운 용어
export const JARGON = [
  "인버터", "컴프레서", "콤프레서", "리니어", "냉매", "직냉식", "간냉식", "히트펌프", "소비전력",
  "정격", "주사율", "명암비", "업스케일링", "로컬 디밍", "데시벨", "와트",
];
// 풀이 없이 써도 되는 영어 약어
export const ALLOWED_ACRONYMS = ["TV", "AI", "PC", "LED", "USB", "LG", "SK"];
// 보고서 말투로 보는 표현
const STIFF_PHRASES = [/겠습니다/g, /수 있습니다/g, /하였습니다/g, /바랍니다/g];
// 문장 끝이 "~니다"인 비율이 이보다 높으면 딱딱한 말투로 봄
export const MAX_FORMAL_RATIO = 0.25;
export const MAX_SENTENCES_PER_PARAGRAPH = 3;
export const MIN_HEADINGS = 3;

export interface StyleReport {
  // 말투·용어·구성: 한 번 다시 쓰게 하고, 다시 써도 남으면 경고로 기록
  styleIssues: string[];
  // 확인되지 않은 가격·모델명: 다시 써도 남으면 오류
  factIssues: string[];
}

const PRICE = /\d{1,3}(?:,\d{3})+\s*원|\d+(?:\.\d+)?\s*만\s*원/g;
// 영문과 숫자가 섞인 5자 이상 토큰 (예: RF85C9101AP)
const MODEL = /\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9][A-Z0-9-]{4,}\b/g;
const normalize = (s: string) => s.replace(/\s/g, "");

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[가-힣]/.test(s));
}

/**
 * body: 제목 줄과 해시태그 줄을 뺀 본문
 * sources: 자료 조사 메모. 가격과 모델명은 여기에 있는 것만 허용
 */
export function checkStyle(body: string, sources = ""): StyleReport {
  const styleIssues: string[] = [];
  const factIssues: string[] = [];
  const lines = body.split("\n").map((l) => l.trim());
  const headings = lines.filter((l) => l.startsWith(HEADING_MARK));
  const prose = lines.filter((l) => !l.startsWith(HEADING_MARK)).join("\n");

  // 말투
  const stiff = STIFF_PHRASES.flatMap((re) => prose.match(re) ?? []);
  if (stiff.length > 0) {
    const kinds = [...new Set(stiff)].map((s) => `"~${s}"`).join(", ");
    styleIssues.push(`보고서 말투 ${kinds}가 ${stiff.length}번 나와요. "~해요", "~예요"처럼 바꿔 주세요.`);
  }
  const endings = splitSentences(prose).map((s) => s.replace(/[\s.!?…~"')\]]+$/u, ""));
  const formal = endings.filter((s) => s.endsWith("니다")).length;
  const friendly = endings.filter((s) => s.endsWith("요")).length;
  if (formal + friendly > 0 && formal / (formal + friendly) > MAX_FORMAL_RATIO) {
    styleIssues.push(`문장 ${formal + friendly}개 중 ${formal}개가 "~니다"로 끝나 딱딱해요. 단골 손님에게 말하듯 "~해요" 체로 써 주세요.`);
  }

  // 어려운 용어와 영어 약어: 처음 나올 때 바로 뒤(12자 안)에 괄호 풀이가 있어야 함
  const unexplained: string[] = [];
  const explainedAt = (term: string, index: number) => {
    const after = prose.slice(index + term.length, index + term.length + 12);
    const cut = after.search(/[.!?\n]/);
    return (cut === -1 ? after : after.slice(0, cut)).includes("(");
  };
  for (const term of JARGON) {
    const i = prose.indexOf(term);
    if (i !== -1 && !explainedAt(term, i)) unexplained.push(term);
  }
  for (const m of prose.matchAll(/\b[A-Z]{2,}\b/g)) {
    const term = m[0];
    if (ALLOWED_ACRONYMS.includes(term) || unexplained.includes(term)) continue;
    if (prose.indexOf(term) === m.index && !explainedAt(term, m.index)) unexplained.push(term);
  }
  if (unexplained.length > 0) {
    styleIssues.push(
      `풀이 없는 어려운 말: ${unexplained.join(", ")}. 처음 나올 때 바로 뒤에 쉬운 말로 풀어 주세요. 예: 인버터 모터(전기를 아끼는 모터)`,
    );
  }

  // 구성
  if (headings.length < MIN_HEADINGS) {
    styleIssues.push(`소제목이 ${headings.length}개예요. "${HEADING_MARK} "로 시작하는 소제목을 ${MIN_HEADINGS}개 이상 달아 주세요.`);
  }
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.split("\n").filter((l) => !l.trim().startsWith(HEADING_MARK)).join("\n").trim())
    .filter(Boolean);
  const long = paragraphs.filter((p) => splitSentences(p).length > MAX_SENTENCES_PER_PARAGRAPH).length;
  if (long > 0) {
    styleIssues.push(`${MAX_SENTENCES_PER_PARAGRAPH}문장이 넘는 긴 문단이 ${long}개예요. 휴대폰에서 읽기 좋게 2~3문장씩 끊어 주세요.`);
  }
  if (paragraphs[0] && !/[?？]/.test(paragraphs[0])) {
    styleIssues.push("첫 문단이 질문으로 시작하지 않아요. 고객이 흔히 하는 고민이나 질문으로 시작해 주세요.");
  }

  // 확인되지 않은 가격과 모델명
  const known = normalize(sources);
  const prices = [...new Set(prose.match(PRICE) ?? [])].filter((p) => !known.includes(normalize(p)));
  if (prices.length > 0) {
    factIssues.push(`자료 조사에서 확인되지 않은 가격: ${prices.join(", ")}. 모르면 "매장에서 확인해 주세요"로 써 주세요.`);
  }
  const models = [...new Set(prose.match(MODEL) ?? [])].filter((m) => !known.includes(m));
  if (models.length > 0) {
    factIssues.push(`자료 조사에서 확인되지 않은 모델명: ${models.join(", ")}. 모르면 "매장에서 확인해 주세요"로 써 주세요.`);
  }

  return { styleIssues, factIssues };
}

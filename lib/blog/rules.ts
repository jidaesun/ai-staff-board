// 의존성 없이 node --test 로 바로 실행할 수 있게 이 파일 안에 둡니다.
export const STORE_NAME = "율량하이마트";
// 본문 글자 수 기준: 공백·줄바꿈을 뺀 글자 수가 이 값보다 커야 함
export const MIN_BODY_CHARS = 1500;

export interface BlogCheck {
  ok: boolean;
  violations: string[];
  bodyChars: number;
  hashtags: string[];
}

const HASHTAG = /(^|\s)#[^\s#]+/;

const countOf = (text: string, word: string) => text.split(word).length - 1;
export const countBodyChars = (body: string) => body.replace(/\s/g, "").length;

/**
 * 블로그 규칙 검증
 * - 매장명은 "율량하이마트"로만 표기 ("하이마트"가 나오면 반드시 "율량하이마트"의 일부여야 함)
 * - 본문(제목 줄, 해시태그 줄 제외) 공백 제외 1,500자 초과
 * - 해시태그는 마지막 줄 한 줄에만, 그 줄은 해시태그로만 구성
 */
export function checkBlog(text: string): BlogCheck {
  const violations: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nonEmpty = lines.map((l, i) => ({ l: l.trim(), i })).filter((x) => x.l);

  // 해시태그 줄
  const tagLines = nonEmpty.filter((x) => HASHTAG.test(x.l));
  const last = nonEmpty.at(-1);
  let hashtags: string[] = [];
  let tagLineIndex = -1;
  if (tagLines.length === 0) {
    violations.push("해시태그 줄이 없습니다.");
  } else if (tagLines.length > 1) {
    violations.push(`해시태그가 ${tagLines.length}줄에 나뉘어 있습니다. 마지막 한 줄에만 모아 주세요.`);
  } else if (tagLines[0].i !== last?.i) {
    violations.push("해시태그 줄이 글의 마지막 줄이 아닙니다.");
  } else {
    tagLineIndex = tagLines[0].i;
    const tokens = tagLines[0].l.split(/\s+/);
    hashtags = tokens.filter((t) => /^#[^\s#]+$/.test(t));
    if (hashtags.length !== tokens.length) {
      violations.push("해시태그 줄에 해시태그가 아닌 내용이 섞여 있습니다.");
    }
  }

  // 본문: 첫 줄이 "제목:"이면 제외, 해시태그 줄 제외
  const titleIndex = nonEmpty[0]?.l.startsWith("제목:") ? nonEmpty[0].i : -1;
  const body = lines.filter((_, i) => i !== titleIndex && i !== tagLineIndex).join("\n");
  const bodyChars = countBodyChars(body);
  if (bodyChars <= MIN_BODY_CHARS) {
    violations.push(`본문이 공백 제외 ${bodyChars.toLocaleString("ko-KR")}자입니다. ${MIN_BODY_CHARS.toLocaleString("ko-KR")}자를 넘어야 합니다.`);
  }

  // 매장명
  const storeCount = countOf(text, STORE_NAME);
  const himartCount = countOf(text, "하이마트");
  if (storeCount === 0) violations.push(`매장명 "${STORE_NAME}"가 본문에 없습니다.`);
  if (himartCount > storeCount) {
    violations.push(`"${STORE_NAME}"가 아닌 "하이마트" 표기가 ${himartCount - storeCount}곳 있습니다. (예: 롯데하이마트, 하이마트 율량점)`);
  }
  const variants = [/하이\s+마트/, /hi-?\s?mart/i, /율량점/, /율량\s+하이\s*마트/];
  for (const re of variants) {
    const m = text.match(re);
    if (m) violations.push(`매장명 변형 표기가 있습니다: "${m[0]}". "${STORE_NAME}"로 통일해 주세요.`);
  }

  return { ok: violations.length === 0, violations: [...new Set(violations)], bodyChars, hashtags };
}

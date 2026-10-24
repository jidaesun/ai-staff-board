// 말투·용어·구성·가격 검사 테스트: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkStyle } from "./style.ts";

const friendly = `냉장고 바꿀 때 몇 리터를 사야 할지 고민되시죠? 매장에서 가장 많이 듣는 질문이에요.

■ 우리 집에 맞는 크기 고르기
4인 가족이라면 800L 정도가 넉넉해요. 일주일 장보기를 한 번에 넣어도 자리가 남거든요.

■ 전기요금 걱정 줄이기
인버터 모터(전기를 아끼는 모터)가 들어간 제품을 추천해요. 하루 종일 켜 두는 냉장고라 요금 차이가 커요.

■ 이런 분께 추천해요
맞벌이라 장을 몰아 보는 집이라면 4도어가 편해요. 가격은 매장에서 확인해 주세요.`;

test("친근한 글은 문제 없음", () => {
  assert.deepEqual(checkStyle(friendly), { styleIssues: [], factIssues: [] });
});

test("보고서 말투를 잡아냄", () => {
  const r = checkStyle(friendly.replace("자리가 남거든요.", "자리가 남을 수 있습니다.").replace("요금 차이가 커요.", "요금을 줄이겠습니다."));
  assert.ok(r.styleIssues.some((i) => i.includes("보고서 말투")), r.styleIssues.join("/"));
});

test("~니다 문장이 많으면 딱딱하다고 봄", () => {
  const stiff = friendly.replace(/요([.?])/g, "니다$1");
  assert.ok(checkStyle(stiff).styleIssues.some((i) => i.includes("딱딱")));
});

test("풀이 없는 전문 용어와 영어 약어를 잡아냄", () => {
  const r = checkStyle(friendly.replace("인버터 모터(전기를 아끼는 모터)", "인버터 모터").replace("4도어가 편해요.", "BLDC 모터와 UHD 화질이 좋아요."));
  const issue = r.styleIssues.find((i) => i.includes("풀이 없는"));
  assert.ok(issue?.includes("인버터") && issue.includes("BLDC") && issue.includes("UHD"), issue);
});

test("괄호 풀이가 있으면 통과, TV 같은 쉬운 약어는 통과", () => {
  const r = checkStyle(friendly.replace("4도어가 편해요.", "OLED(스스로 빛을 내는 화면) TV가 좋아요. OLED는 화면이 선명해요."));
  assert.deepEqual(r.styleIssues, []);
});

test("소제목이 부족하면 잡아냄", () => {
  assert.ok(checkStyle(friendly.replace(/■ /g, "")).styleIssues.some((i) => i.includes("소제목")));
});

test("4문장 이상 문단을 잡아냄", () => {
  const r = checkStyle(friendly.replace("자리가 남거든요.", "자리가 남거든요. 김치도 들어가요. 음료도 넉넉해요."));
  assert.ok(r.styleIssues.some((i) => i.includes("긴 문단이 1개")));
});

test("첫 문단이 질문이 아니면 잡아냄", () => {
  assert.ok(checkStyle(friendly.replace("고민되시죠?", "고민되실 거예요.")).styleIssues.some((i) => i.includes("첫 문단")));
});

test("자료 조사에 없는 가격과 모델명은 사실 문제로 분류", () => {
  const text = friendly.replace("가격은 매장에서 확인해 주세요.", "RF85C9101AP 모델은 2,190,000원, 다른 모델은 189만 원이에요.");
  const r = checkStyle(text, "- RF85C9101AP 출시 (https://example.com)");
  assert.equal(r.factIssues.length, 1, r.factIssues.join("/"));
  assert.ok(r.factIssues[0].includes("2,190,000원") && r.factIssues[0].includes("189만 원"));
  const r2 = checkStyle(text, "- RF85C9101AP 2,190,000원, 189만원 (https://example.com)");
  assert.deepEqual(r2.factIssues, []);
  assert.ok(checkStyle(text, "").factIssues.some((i) => i.includes("RF85C9101AP")));
});

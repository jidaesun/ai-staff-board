// 블로그 규칙 검증 테스트: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBlog } from "./rules.ts";

const para = "율량하이마트에서 냉장고를 고를 때 용량과 에너지 효율, 설치 공간을 함께 살펴보면 좋습니다. ";
const body = (n: number) => Array.from({ length: n }, () => para).join("\n\n");
const good = `제목: 냉장고 고르는 법\n\n${body(40)}\n\n#율량하이마트 #냉장고 #대형가전`;

test("규칙을 지킨 글은 통과", () => {
  const r = checkBlog(good);
  assert.equal(r.ok, true, r.violations.join("/"));
  assert.ok(r.bodyChars > 1500);
  assert.deepEqual(r.hashtags, ["#율량하이마트", "#냉장고", "#대형가전"]);
});
test("본문 1500자 이하면 실패 (공백 제외, 정확히 1500은 실패)", () => {
  const r = checkBlog(`제목: x\n\n율량하이마트${"가".repeat(1494)}\n\n#a`);
  assert.equal(r.bodyChars, 1500);
  assert.equal(r.ok, false);
  const r2 = checkBlog(`제목: x\n\n율량하이마트${"가".repeat(1495)}\n\n#a`);
  assert.equal(r2.ok, true, r2.violations.join("/"));
});
test("제목과 해시태그 줄은 본문 글자 수에서 제외", () => {
  const r = checkBlog(`제목: ${"제".repeat(500)}\n\n율량하이마트${"가".repeat(1200)}\n\n#${"태".repeat(400)}`);
  assert.equal(r.bodyChars, 1206);
});
test("해시태그가 두 줄이면 실패", () => {
  const r = checkBlog(`${good}\n#추가태그`);
  assert.ok(r.violations.some((v) => v.includes("2줄")));
});
test("해시태그가 본문 중간에 있으면 실패", () => {
  const r = checkBlog(good.replace("살펴보면", "#살펴보면"));
  assert.equal(r.ok, false);
});
test("해시태그 줄에 일반 글이 섞이면 실패", () => {
  const r = checkBlog(good.replace("#율량하이마트 #냉장고", "#율량하이마트 냉장고"));
  assert.ok(r.violations.some((v) => v.includes("섞여")));
});
test("해시태그가 없으면 실패", () => {
  assert.ok(checkBlog(`제목: x\n\n${body(40)}`).violations.some((v) => v.includes("없습니다")));
});
for (const bad of ["롯데하이마트", "하이마트 율량점", "율량 하이마트", "하이 마트", "Hi-Mart", "하이마트"]) {
  test(`매장명 변형 "${bad}" 실패`, () => {
    const r = checkBlog(good.replace("설치 공간을", `${bad} 설치 공간을`));
    assert.equal(r.ok, false, bad);
  });
}
test("매장명이 아예 없으면 실패", () => {
  const r = checkBlog(good.replaceAll("율량하이마트", "우리 매장"));
  assert.ok(r.violations.some((v) => v.includes("없습니다")));
});

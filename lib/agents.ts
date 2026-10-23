// 현황판에 표시하는 AI 직원 (고정). DB의 agents.name 과 이름으로 매칭합니다.
export const FIXED_AGENTS = [
  { slug: "large-appliance", name: "대형가전 AI", avatar: "🧊" },
  { slug: "living-appliance", name: "생활가전 AI", avatar: "🧺" },
  { slug: "kitchen-appliance", name: "주방가전 AI", avatar: "🍳" },
  { slug: "pc", name: "PC AI", avatar: "💻" },
  { slug: "mobile", name: "모바일 AI", avatar: "📱" },
] as const;

export type FixedAgent = (typeof FIXED_AGENTS)[number];

export function findFixedAgent(slug: string): FixedAgent | undefined {
  return FIXED_AGENTS.find((a) => a.slug === slug);
}

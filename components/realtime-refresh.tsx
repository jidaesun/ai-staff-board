"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

const TABLES = ["agents", "tasks", "task_steps", "outputs"];

// 테이블이 바뀌면 서버 컴포넌트를 다시 불러옵니다 (Realtime이 켜진 테이블만 이벤트가 옴)
export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };

    const channel = supabase.channel("staff-board");
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type AdvanceResponse =
  | { state: "ran"; step: string; status: string }
  | { state: "busy"; step: string | null }
  | { state: "finished"; status: string }
  | { state: "failed"; step: string | null; error: string }
  | { error: string };

const BUSY_RETRY_MS = 3000;

/**
 * 서버에 "다음 단계 실행"을 한 단계씩 요청합니다. 진행 상황은 이 컴포넌트가 아니라
 * DB에 기록된 task_steps 를 다시 읽어(router.refresh) 화면에 표시합니다.
 */
export function TaskRunner({ taskId, autoStart }: { taskId: string; autoStart: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  const run = useCallback(async () => {
    if (abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setMessage(null);
    try {
      while (!controller.signal.aborted) {
        const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/advance`, {
          method: "POST",
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => ({ error: `서버 오류 (${res.status})` }))) as AdvanceResponse;
        router.refresh();

        if ("state" in data) {
          if (data.state === "failed" || data.state === "finished") break;
          if (data.state === "ran" && data.status === "done") break;
          if (data.state === "busy") await new Promise((r) => setTimeout(r, BUSY_RETRY_MS));
        } else {
          setMessage(data.error);
          break;
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      abortRef.current = null;
      if (!controller.signal.aborted) setRunning(false);
    }
  }, [router, taskId]);

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      void run();
    }
  }, [autoStart, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-lg bg-sky-50 px-3 py-3 text-sm text-sky-800 sm:flex-row sm:items-center sm:justify-between dark:bg-sky-500/10 dark:text-sky-200">
      <p>
        {running
          ? "단계를 실행하고 있습니다. 이 화면을 닫으면 지금 단계가 끝난 뒤 멈추고, 다시 열어 이어서 실행할 수 있습니다."
          : (message ?? "아직 끝나지 않은 작업입니다.")}
      </p>
      {!running && (
        <button
          type="button"
          onClick={() => void run()}
          className="h-9 shrink-0 rounded-lg bg-sky-600 px-4 font-medium text-white transition hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-900"
        >
          이어서 실행
        </button>
      )}
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth-actions";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader({
  title,
  subtitle,
  email,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  email: string | undefined;
  back?: boolean;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            ← 현황판
          </Link>
        )}
        <h1 className={`${back ? "mt-2 " : ""}text-2xl font-bold tracking-tight break-keep sm:text-3xl`}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {email && (
          <span
            className="order-last w-full truncate text-xs text-slate-500 sm:order-none sm:w-auto sm:max-w-[16rem] sm:text-sm dark:text-slate-400"
            title={email}
          >
            {email}
          </span>
        )}
        <ThemeToggle />
        <form action={signOut}>
          <button
            type="submit"
            className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            로그아웃
          </button>
        </form>
      </div>
    </header>
  );
}

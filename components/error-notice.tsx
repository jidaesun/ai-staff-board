export function ErrorNotice({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
    >
      {message}
    </p>
  );
}

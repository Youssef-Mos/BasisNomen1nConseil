export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-12 border-b border-(--border-default) bg-(--bg-surface) flex items-center px-4 shrink-0">
        <a href="/admin" className="font-semibold text-sm text-(--text-primary) hover:text-blue-600">
          Basis Norm Explorer
        </a>
        <span className="ml-2 text-xs text-(--text-muted) font-mono">ADMIN</span>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <header className="h-12 border-b border-(--border-default) bg-(--bg-surface) flex items-center px-4 shrink-0 gap-4">
        <a href="/admin" className="font-semibold text-sm text-(--text-primary) hover:text-blue-600">
          Basis Norm Explorer
        </a>
        <span className="text-xs text-(--text-muted) font-mono">ADMIN</span>
        <nav className="ml-4 flex items-center gap-3">
          <a href="/admin" className="text-sm text-(--text-secondary) hover:text-blue-600 transition-colors">
            Documents
          </a>
          <a href="/admin/filters" className="text-sm text-(--text-secondary) hover:text-blue-600 transition-colors">
            Filters
          </a>
        </nav>
      </header>
      <main className="flex-1 flex flex-col overflow-y-auto">{children}</main>
    </div>
  );
}

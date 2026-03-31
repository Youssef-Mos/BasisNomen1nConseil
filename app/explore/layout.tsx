import ThemeToggle from "@/components/ui/ThemeToggle";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-(--bg-page)">
      <header className="h-14 border-b border-(--border-default) bg-(--bg-surface) flex items-center px-6 shrink-0 shadow-sm relative z-20">
        <a
          href="/explore"
          className="font-bold text-sm text-(--text-primary) hover:text-blue-600 transition-colors tracking-tight"
        >
          Basis Norm Explorer
        </a>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      {/* flex flex-col so DocumentViewer can use flex-1 to fill remaining height.
          overflow-y-auto handles the /explore list page if it ever gets long. */}
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

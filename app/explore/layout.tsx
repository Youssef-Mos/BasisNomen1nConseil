export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa]">
      <header className="h-14 border-b border-gray-100 bg-white flex items-center px-6 shrink-0 shadow-sm relative z-20">
        <a
          href="/explore"
          className="font-bold text-sm text-gray-800 hover:text-blue-600 transition-colors tracking-tight"
        >
          Basis Norm Explorer
        </a>
      </header>
      {/* flex flex-col so DocumentViewer can use flex-1 to fill remaining height.
          overflow-y-auto handles the /explore list page if it ever gets long. */}
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

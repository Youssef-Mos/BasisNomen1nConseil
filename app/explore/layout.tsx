export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-12 border-b border-gray-200 bg-white flex items-center px-4 shrink-0">
        <a href="/explore" className="font-semibold text-sm text-gray-800 hover:text-blue-600">
          Basis Norm Explorer
        </a>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

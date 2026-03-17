type AppShellProps = {
  title: string;
  subtitle: string;
  status: string;
};

export function AppShell({ title, subtitle, status }: AppShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Basis Norm Explorer
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="max-w-3xl text-slate-600">{subtitle}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
        {status}
      </section>
    </main>
  );
}

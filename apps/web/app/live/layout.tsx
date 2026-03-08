export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Our Stake</h1>
        <p className="text-xs text-muted-foreground">Live Visit</p>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

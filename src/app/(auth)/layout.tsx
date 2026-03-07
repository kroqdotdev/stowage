export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50/40 via-background to-stone-100/30 dark:from-stone-950 dark:via-background dark:to-stone-900/30">
      {children}
    </div>
  );
}

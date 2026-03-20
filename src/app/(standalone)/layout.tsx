export default function StandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-app-bg-from via-app-bg-via to-app-bg-to">
      {children}
    </div>
  );
}

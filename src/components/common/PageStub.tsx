// Phase A 임시 스텁 — Phase B~D에서 실제 내용으로 교체
export default function PageStub({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-3xl font-light text-[var(--foreground)] mb-4">{title}</h1>
        <p className="text-[var(--text-secondary)]">준비 중입니다.</p>
      </div>
    </main>
  );
}

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-start gap-3 bg-white border border-[#e5e7eb] rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-2 text-primary">
        <span className="material-symbols-outlined">build</span>
        <p className="text-xs font-bold uppercase tracking-wide">In development</p>
      </div>
      <h1 className="text-2xl font-black text-[#111318] tracking-tight">{title}</h1>
      <p className="text-sm text-[#616f89]">
        {description ?? 'This area is on the way. Check back soon for the full experience.'}
      </p>
    </div>
  );
}

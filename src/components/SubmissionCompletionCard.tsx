'use client';

export function SubmissionCompletionCard() {
  const completionPercentage = 92;

  return (
    <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
      <h4 className="text-sm font-bold text-primary mb-4">Submission Completion</h4>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-primary">{completionPercentage}</span>
        <span className="text-sm text-primary/60 font-bold">/ 100</span>
      </div>
      <p className="text-xs text-primary/80 mt-2 leading-relaxed">
        Great job! You are in the top 5% of most punctual submissions this semester.
      </p>
      <div className="mt-4 pt-4 border-t border-primary/10 flex justify-between text-[11px] font-bold text-primary/60">
        <span>On Time: 100%</span>
        <span>Quality: 88%</span>
      </div>
    </div>
  );
}

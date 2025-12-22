import type { Dive, DiveProfile } from '@/types/dive';

export default function CreateSummary({
  selectedDive
}: Readonly<{
  selectedDive: Dive;
}>) {
  const summary = [
    { display: "Maximum depth", value: computeMaxDepth(selectedDive) }
  ];
  return (
    <article>
      <header className="h-10 bg-sky-500 flex items-center border-b-2 shrink-0 pl-4">
        <h1 className={`text-black text-[20px] font-bold`}>Dive summary</h1>
      </header>
      <main className="overflow-y-auto flex-1 min-h-0 bg-white pl-4">
        {summary.map((item) => (
          <span className="text-black" key={item.display}>{item.display + ": " + item.value}</span>
        ))}
      </main>
    </article>
  );
}

// compute maximum depth
function maxDepthOfProfile(profile: DiveProfile) {
  const summaryMaxDepth = profile.summary?.maxDepth;
  if (summaryMaxDepth) {
    return summaryMaxDepth;
  } else {
    const depths = profile.measurements.flatMap(measurement => measurement.measurement.depth);
    return Math.max(...depths);
  }
}

function computeMaxDepth(selectedDive: Dive) {
  const maxDepths = selectedDive.profiles.flatMap(profile => maxDepthOfProfile(profile));
  return Math.max(...maxDepths);
}
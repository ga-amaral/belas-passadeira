export default function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="animate-pulse border-b border-brand-gold/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-brand-gold/10 rounded-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white rounded-xl p-5 shadow-card ${className}`}>
      <div className="h-4 w-24 bg-brand-gold/10 rounded-full mb-3" />
      <div className="h-8 w-32 bg-brand-gold/15 rounded-full" />
    </div>
  );
}

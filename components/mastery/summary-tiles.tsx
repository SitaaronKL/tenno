import type { MasteryProgress } from "./api";

function Tile({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function SummaryTiles({ progress }: { progress: MasteryProgress }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Tile
        label="Mastered"
        value={`${progress.mastered}`}
        helper={`of ${progress.total} items that give mastery`}
      />
      <Tile label="Percent" value={`${progress.percent}%`} helper="of the whole roster" />
      <Tile
        label="Rank"
        value={progress.profile ? `${progress.profile.masteryRank}` : "—"}
        helper={
          progress.profile
            ? `${progress.profile.displayName}, ${progress.profile.nodesCompleted} nodes cleared`
            : "Sync a profile to see your rank"
        }
      />
    </div>
  );
}

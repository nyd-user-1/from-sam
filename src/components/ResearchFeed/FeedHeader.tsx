import { ChevronLeft, ChevronRight } from "lucide-react";

/** The rail's pages, when it has more than one: where we are, and how to move. */
export interface Pager {
  index: number;
  count: number;
  onPage: (index: number) => void;
}

const ARROW =
  "inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

export function FeedHeader({ label = "Live Feed", pager }: { label?: string; pager?: Pager }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <span className="block h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.6)]" />
      <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
        {label}
      </span>
      {pager && pager.count > 1 && (
        <span className="ml-1 flex items-center gap-0.5">
          <button
            onClick={() => pager.onPage(pager.index - 1)}
            disabled={pager.index <= 0}
            aria-label="Previous"
            className={ARROW}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => pager.onPage(pager.index + 1)}
            disabled={pager.index >= pager.count - 1}
            aria-label="Next"
            className={ARROW}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </div>
  );
}

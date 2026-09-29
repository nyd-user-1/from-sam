import { useEffect, useRef } from "react";
import { useResearchFeed } from "@/hooks/useResearchFeed";
import { useFormProgress } from "@/hooks/useFormProgress";
import { FormProgress } from "@/components/FormProgress";
import { FeedHeader } from "./FeedHeader";
import { FeedItem } from "./FeedItem";
import { PapersList } from "./PapersList";
import { FormsList } from "./FormsList";

/** What the panel is showing. Same shell, same width, same open/close. */
export type FeedMode = "activity" | "papers" | "forms";

/**
 * The forms rail has two pages once a form is being filled: the forms to pick
 * from, and the progress of the one picked. The header's arrows move between
 * them; the layout flips to the second when a filling begins.
 */
export type RailPage = "forms" | "progress";

interface ResearchFeedProps {
  isOpen: boolean;
  /** `activity` is the live feed; `papers` is the newest preprints, draggable. */
  mode?: FeedMode;
  onClose?: () => void;
  page?: RailPage;
  onPage?: (page: RailPage) => void;
}

export function ResearchFeed({ isOpen, mode = "activity", page = "forms", onPage }: ResearchFeedProps) {
  const { events } = useResearchFeed();
  const { spec } = useFormProgress();
  const papers = mode === "papers";
  const forms = mode === "forms";

  const pages: RailPage[] = spec ? ["forms", "progress"] : ["forms"];
  const shown: RailPage = spec && page === "progress" ? "progress" : "forms";

  // Each page starts at its top; the other page's scroll position is not
  // this one's.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [shown]);

  return (
    <aside
      className={`${
        isOpen ? "w-[300px]" : "w-0"
      } flex-shrink-0 transition-all duration-200 ease-in-out fixed inset-y-0 right-0 z-50 md:relative md:inset-auto md:z-auto ${
        isOpen ? "overflow-visible" : "overflow-hidden"
      }`}
    >
      <div className="w-[300px] h-full flex flex-col bg-background">
        <FeedHeader
          label={forms ? (shown === "progress" ? "Progress" : "Official forms") : papers ? "Bills" : "Live Feed"}
          pager={
            forms && pages.length > 1
              ? { index: pages.indexOf(shown), count: pages.length, onPage: (i) => onPage?.(pages[i]) }
              : undefined
          }
        />

        <div ref={scroller} className="flex-1 overflow-y-auto">
          {forms ? (
            // Both pages stay mounted: the progress page holds the built PDF
            // and the delivery form, which a look at the forms list must not
            // throw away.
            <>
              <div className={shown === "forms" ? "" : "hidden"}>
                <FormsList />
              </div>
              {spec && (
                <div className={shown === "progress" ? "" : "hidden"}>
                  <FormProgress key={spec.form.id} form={spec.form} answers={spec.answers} progress={spec.progress} />
                </div>
              )}
            </>
          ) : papers ? (
            // Mounts instantly: AppLayout warms the same react-query key on app
            // mount, so this reads from cache and never shows a spinner. The
            // rows are not kept in the DOM while the feed is showing — the
            // prefetch, not a hidden render, is what makes opening feel free.
            <PapersList />
          ) : events.length === 0 ? (
            <p className="px-4 py-8 text-xs text-muted-foreground text-center">
              Activity will appear here as you explore
            </p>
          ) : (
            events.map((event) => <FeedItem key={event.id} event={event} />)
          )}
        </div>
      </div>
    </aside>
  );
}

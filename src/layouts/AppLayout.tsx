import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { List, ClipboardList, Info, X } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { FORMS_PANEL, formsPanelSpec } from "@/components/FormsList";
import { formPanelSpec } from "@/components/FormPanel";
import { Tooltip as Hint } from "@/components/ui/tooltip";
import { AppPanelProvider, useAppPanel } from "@/hooks/useAppPanel";
import { FormProgressContext, type FormProgressSpec } from "@/hooks/useFormProgress";
import { useRecentPapers } from "@/hooks/useRecentPapers";

/**
 * The toolbar's forms button. Open: the panel closes. Closed: the panel opens
 * on the form being filled, or on the forms when nothing is (2026-09-29).
 */
function FormsButton({ spec }: { spec: FormProgressSpec | null }) {
  const { panelId, openPanel, closePanel } = useAppPanel();
  const on = panelId === FORMS_PANEL || (panelId?.startsWith("form:") ?? false);
  return (
    <Hint label="Official forms" side="bottom">
      <button
        onClick={() => (on ? closePanel() : openPanel(spec ? formPanelSpec(spec.form) : formsPanelSpec()))}
        aria-label="Official forms"
        aria-pressed={on}
        className={`inline-flex items-center justify-center h-10 w-10 rounded-md transition-colors hover:bg-muted ${on ? "bg-muted text-foreground" : "text-foreground"}`}
      >
        <ClipboardList className="h-5 w-5" />
      </button>
    </Hint>
  );
}

/**
 * When a filling begins, the panel opens on that form: its record lives
 * there. When it ends with the form still showing, the panel goes back to
 * the forms. Not on a phone, where the panel would cover the chat it is
 * reporting on.
 */
function FormPanelOpener({ spec }: { spec: FormProgressSpec | null }) {
  const { panelId, openPanel } = useAppPanel();
  const form = spec?.form;
  const formRef = useRef(form);
  formRef.current = form;
  const panelRef = useRef(panelId);
  panelRef.current = panelId;
  const formId = form?.id;
  const prev = useRef<string | undefined>(undefined);
  useEffect(() => {
    const was = prev.current;
    prev.current = formId;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const f = formRef.current;
    if (formId && f) openPanel(formPanelSpec(f));
    else if (was && panelRef.current?.startsWith("form:")) openPanel(formsPanelSpec());
  }, [formId, openPanel]);
  return null;
}

export function AppLayout() {
  // Warm the Papers panel's query as the app mounts, so the first open renders
  // from cache rather than a spinner. One request per session; the endpoint is
  // edge-cached for an hour behind that.
  useRecentPapers();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const panelRoot = useRef<HTMLDivElement | null>(null);

  // The form being filled, as the chat page publishes it (hooks/useFormProgress).
  // The form's panel reads it live.
  const [spec, setSpec] = useState<FormProgressSpec | null>(null);
  const progressCtx = useMemo(() => ({ spec, publish: setSpec }), [spec]);

  return (
    <FormProgressContext.Provider value={progressCtx}>
    <AppPanelProvider portalRoot={panelRoot}>
    <FormPanelOpener spec={spec} />
    <div className="flex h-dvh bg-background p-0 md:p-4">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* App wrapper — rounded border container */}
      <div
        id="app-shell-panel"
        className="relative flex flex-1 flex-col min-w-0 md:rounded-xl md:border bg-background overflow-hidden"
        onClick={() => {}}
      >
        {/* Top bar — floats over the scroll pane. No rule and no background:
            content passes under it and blurs, and the blur fades out across
            the bar's lower 28px (the .header-blur mask) so there is no edge.
            The bar is pointer-transparent except for its controls, so the
            fade zone never swallows a click. #app-main pads by the same
            --spacing-header so nothing loads hidden beneath it. */}
        <div className="header-blur pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-4 pb-9 pt-2">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="pointer-events-auto inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
          >
            <List className="h-5 w-5" />
          </button>

          {/* Search bar portal target — filled by page components */}
          <div id="header-search" className="pointer-events-auto flex-1 mx-2" />

          <div className="pointer-events-auto flex items-center gap-0.5">
            <FormsButton spec={spec} />
          </div>
        </div>

        {/* Page content */}
        <main id="app-main" className="flex-1 overflow-y-auto pt-header">
          <Outlet />
        </main>
      </div>

      {/* App-shell push panel portal target — see components/AppPanel + hooks/useAppPanel.
          The forms live in it (2026-09-29), and so does the form being filled. */}
      <div id="app-panel-root" ref={panelRoot} className="flex shrink-0 h-full" />

      {/* Pinned info button */}
      <button
        onClick={() => setDisclaimerOpen(true)}
        className="fixed bottom-5 right-[30px] z-50 inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
      >
        <Info className="h-5 w-5" />
      </button>

      {/* Disclaimer dialog */}
      {disclaimerOpen && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/50 animate-in fade-in duration-150"
            onClick={() => setDisclaimerOpen(false)}
          />
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-xl border bg-popover shadow-popover animate-in fade-in zoom-in-95 duration-150 p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold">Disclaimer</h2>
                <button
                  onClick={() => setDisclaimerOpen(false)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                livingston is an independent project and is not affiliated with, endorsed by, or sponsored by medRxiv.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                Preprint metadata is publicly available from the medRxiv API. Preprints are not peer reviewed. This application is provided as-is for research and educational purposes.
              </p>
              <button
                onClick={() => setDisclaimerOpen(false)}
                className="mt-5 w-full rounded-lg bg-foreground text-background py-2 text-sm font-medium hover:bg-foreground/85 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    </AppPanelProvider>
    </FormProgressContext.Provider>
  );
}

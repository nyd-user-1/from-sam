import { useAppPanel } from "@/hooks/useAppPanel";
import { FormCard } from "@/components/FormCard";
import { formPanelSpec } from "@/components/FormPanel";
import { railForms } from "@/lib/programs";

/** The panel id the forms list opens under, so the toolbar button can tell it apart. */
export const FORMS_PANEL = "forms";

/** Everything the app-shell panel needs to show the forms; hand it to openPanel. */
export const formsPanelSpec = () => ({ id: FORMS_PANEL, title: "Official forms", content: <FormsList /> });

/**
 * The official forms, as cards you can pick up — in the app-shell panel
 * (2026-09-29; before that, a rail of its own). Dropping one on the chat
 * starts filling it; clicking one opens the form's own panel in its place.
 */
export function FormsList() {
  const { openPanel } = useAppPanel();

  return (
    <div className="flex flex-col gap-3 px-3 pb-3 pt-2">
      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
        Drag one onto the chat. Penny fills the applications in with you, and talks the rest through.
      </p>

      <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Let's fill it in together
      </p>
      {railForms().map((f) => (
        <FormCard key={f.id} form={f} onOpen={() => openPanel(formPanelSpec(f))} />
      ))}
    </div>
  );
}

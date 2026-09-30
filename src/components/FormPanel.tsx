import { Check } from "lucide-react";
import { formStats, type ProgramForm } from "@/lib/programs";
import { useFormProgress } from "@/hooks/useFormProgress";
import { FormProgress } from "@/components/FormProgress";

/**
 * A form, in the app-shell panel: what it is, what it covers, its sections —
 * and, while the chat is filling it, how far along that is (2026-09-29).
 *
 * The progress sits under the blurb: the count, the bar, the button that puts
 * the answers on the PDF, and the answers themselves. The sections list is the
 * same list as before, with a check on each section the interview has
 * finished and a dot on the one it is in.
 */
export function FormPanel({ form }: { form: ProgramForm }) {
  const { spec } = useFormProgress();
  const live = spec && spec.form.id === form.id ? spec : null;
  const stats = formStats(form);
  const states = new Map((live?.sections ?? []).map((s) => [s.n, s.state] as const));

  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <p className="font-medium text-foreground">{form.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {form.agency}
          {form.revision ? ` · rev. ${form.revision}` : ""}
        </p>
      </div>

      <p className="text-sm text-foreground">{form.blurb}</p>

      {live && <FormProgress key={live.form.id} form={live.form} answers={live.answers} progress={live.progress} />}

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Covers</p>
        <ul className="mt-1.5 space-y-1">
          {form.covers.map((c) => (
            <li key={c} className="text-xs text-foreground">
              {c}
            </li>
          ))}
        </ul>
      </div>

      {form.pdf ? (
        <>
          <p className="text-xs text-muted-foreground">
            {form.pages} pages. {stats.questionSections} sections ask you something; {stats.readingPages} pages are
            notices to read, with nothing to fill in.
          </p>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sections</p>
            <ol className="mt-1.5 space-y-1.5">
              {form.sections.map((s) => {
                const state = states.get(s.n);
                return (
                  <li key={s.n} className="flex items-baseline gap-1.5 text-xs">
                    {live && (
                      <span className="flex w-3 shrink-0 items-center justify-center self-center">
                        {state === "done" ? (
                          <Check className="h-3 w-3 text-foreground" aria-label="done" />
                        ) : state === "progress" ? (
                          <span className="block h-1.5 w-1.5 rounded-full bg-foreground" aria-label="in progress" />
                        ) : null}
                      </span>
                    )}
                    <span>
                      <span className="font-medium text-foreground">
                        {/^\d/.test(s.n) ? `${s.n}. ` : ""}
                        {s.title}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · p.{s.pages.join(", ")}
                        {s.consent ? " · read only" : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          <a
            href={form.pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs text-brand hover:bg-muted"
          >
            Open the blank form
          </a>
        </>
      ) : (
        form.apply && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">How to apply</p>
            <p className="mt-1 text-xs text-foreground">{form.apply.how}</p>
            {form.apply.phone && <p className="mt-1.5 text-xs font-medium text-foreground">{form.apply.phone}</p>}
            {form.apply.url && (
              <a
                href={form.apply.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate text-xs text-brand hover:underline"
              >
                {form.apply.url}
              </a>
            )}
          </div>
        )
      )}
    </div>
  );
}

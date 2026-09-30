import { useState } from "react";
import { displayValue, formStats, isActionKey, labelFor, optionsFor, type ProgramForm } from "@/lib/programs";
import { optionParts } from "@/lib/form-fields";
import { useFormProgress, type FormProgressSpec } from "@/hooks/useFormProgress";
import { FormPanelFooter } from "@/components/FormPanelFooter";

/** Everything the app-shell panel needs to show a form; hand it to openPanel. */
export const formPanelSpec = (f: ProgramForm) => ({
  id: `form:${f.id}`,
  title: f.code,
  content: <FormPanel form={f} />,
  footer: <FormPanelFooter form={f} />,
});

/**
 * A form, in the app-shell panel.
 *
 * Before the chat is filling it: what it is, what it covers, its sections.
 * While the chat is filling it (2026-09-29): the record — the section the
 * interview is in and every answer so far, each one editable in place — with
 * Put it on the form in the panel's footer.
 */
export function FormPanel({ form }: { form: ProgramForm }) {
  const { spec } = useFormProgress();
  const live = spec && spec.form.id === form.id ? spec : null;
  return live ? <Filling form={form} spec={live} /> : <Detail form={form} />;
}

const INPUT =
  "w-full rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-[3px] focus:ring-ring/25";

function Filling({ form, spec }: { form: ProgramForm; spec: FormProgressSpec }) {
  const entries = Object.entries(spec.answers.values).filter(([k]) => !isActionKey(k));
  const current = spec.progress?.current;
  return (
    <>
      <div className="border-b px-4 py-3 text-xs text-muted-foreground">
        {form.agency}
        {form.revision ? ` · rev. ${form.revision}` : ""}
      </div>
      <div className="p-4">
        {current && <p className="text-[12px] text-muted-foreground">Section {current}</p>}
        {entries.length > 0 ? (
          <dl className={`border-t border-border ${current ? "mt-3" : ""}`}>
            {entries.map(([k, v]) => (
              <Row key={k} k={k} v={v} onSave={spec.edit ? (nv) => spec.edit?.({ [k]: nv }) : undefined} />
            ))}
          </dl>
        ) : (
          <p className={`text-[12px] text-muted-foreground ${current ? "mt-3" : ""}`}>No answers yet.</p>
        )}
      </div>
    </>
  );
}

/**
 * One answer: the label, then the value — a click opens it for a change. The
 * stored value is what is edited; a key with fixed choices gets those
 * choices, everything else a box. Enter or leaving the box keeps the change,
 * Escape drops it. The change lands in the record only; nothing is said to
 * the model.
 */
function Row({ k, v, onSave }: { k: string; v: string; onSave?: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(v);
  const opts = optionsFor(k);

  const start = () => {
    if (!onSave) return;
    setDraft(v);
    setEditing(true);
  };
  const commit = (nv: string) => {
    setEditing(false);
    const t = nv.trim();
    if (t !== v) onSave?.(t);
  };
  const cancel = () => setEditing(false);

  let control: React.ReactNode = null;
  if (editing && opts && !opts.multi) {
    control = (
      <select
        autoFocus
        value={draft}
        onChange={(e) => commit(e.target.value)}
        onBlur={cancel}
        onKeyDown={(e) => e.key === "Escape" && cancel()}
        className={INPUT}
      >
        {!opts.options.some((o) => optionParts(o).value === draft) && <option value={draft}>{draft || "—"}</option>}
        {opts.options.map((o) => {
          const { value, label } = optionParts(o);
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    );
  } else if (editing && opts?.multi) {
    const chosen = draft.split(",").map((s) => s.trim()).filter(Boolean);
    control = (
      <div className="rounded-md border border-border bg-background p-2" onKeyDown={(e) => e.key === "Escape" && cancel()}>
        {opts.options.map((o) => {
          const { value, label } = optionParts(o);
          const on = chosen.includes(value);
          return (
            <label key={value} className="flex cursor-pointer items-center gap-2 py-0.5 text-[12px] text-foreground">
              <input
                type="checkbox"
                checked={on}
                onChange={() => setDraft((on ? chosen.filter((c) => c !== value) : [...chosen, value]).join(", "))}
                className="h-3.5 w-3.5 accent-foreground"
              />
              {label}
            </label>
          );
        })}
        <div className="mt-1.5 flex gap-2">
          <button type="button" onClick={() => commit(draft)} className="rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background">
            Done
          </button>
          <button type="button" onClick={cancel} className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    );
  } else if (editing) {
    control = (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") cancel();
        }}
        className={INPUT}
      />
    );
  }

  return (
    <div className="border-b border-border/40 py-1.5">
      <dt className="text-[11px] text-muted-foreground" title={k}>
        {labelFor(k)}
      </dt>
      <dd className="mt-0.5">
        {editing ? (
          control
        ) : (
          <button
            type="button"
            onClick={start}
            title={onSave ? "Click to change" : undefined}
            className={`-mx-1 block w-full rounded px-1 text-left text-[12px] text-foreground ${onSave ? "cursor-text hover:bg-muted/60" : "cursor-default"}`}
          >
            {displayValue(k, v) || "—"}
          </button>
        )}
      </dd>
    </div>
  );
}

function Detail({ form }: { form: ProgramForm }) {
  const stats = formStats(form);
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
              {form.sections.map((s) => (
                <li key={s.n} className="text-xs">
                  <span className="font-medium text-foreground">
                    {/^\d/.test(s.n) ? `${s.n}. ` : ""}
                    {s.title}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · p.{s.pages.join(", ")}
                    {s.consent ? " · read only" : ""}
                  </span>
                </li>
              ))}
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

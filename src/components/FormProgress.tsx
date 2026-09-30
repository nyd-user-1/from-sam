import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { answerCount, type FormAnswers } from "@/lib/form-answers";
import { displayValue, isActionKey, labelFor, type ProgramForm } from "@/lib/programs";
import { FormDelivery } from "@/components/FormDelivery";

/**
 * What the form knows so far, in the form's panel beside the chat.
 *
 * It used to sit folded above the input and open into the transcript's
 * column, which was too much for that space to hold (2026-09-29). Here the
 * count is real, the sections tick off as they finish, every answer is on
 * view, and the filled PDF is one click away at any point — half finished is
 * still worth more than a blank form.
 *
 * `progress` comes from the page (formProgress in programs.ts): it counts a
 * section done when the interview has moved past it, not only when the model
 * remembered to say so, and it names the section that is open so the printed
 * number and the count stop contradicting each other.
 */
export function FormProgress({
  form,
  answers,
  progress,
}: {
  form: ProgramForm;
  answers: FormAnswers;
  progress?: { done: number; total: number; current?: string };
}) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const total = progress?.total ?? form.sections.filter((s) => !s.consent).length;
  const done = progress?.done ?? answers.done.length;
  const n = answerCount(answers);
  const current = progress?.current && /^\d/.test(progress.current) ? `Section ${progress.current} · ` : "";
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;

  async function build() {
    setBusy(true);
    setErr(null);
    try {
      // pdf-lib is ~350 KB; it has no business loading until someone asks for
      // the document.
      const { fillForm } = await import("@/lib/fill-form");
      const out = await fillForm(form, answers);
      setBytes(out);
      const blob = new Blob([out as BlobPart], { type: "application/pdf" });
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const entries = Object.entries(answers.values).filter(([k]) => !isActionKey(k));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-muted-foreground">
          {current}
          {n} answer{n === 1 ? "" : "s"} · {done} of {total} sections done
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <button
        onClick={build}
        disabled={busy || n === 0}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {url ? "Rebuild" : "Put it on the form"}
      </button>

      {err && <p className="text-[11px] text-destructive">{err}</p>}

      {url && bytes && (
        <FormDelivery
          form={form}
          url={url}
          county={answers.values["address.county"]}
          pdfBase64={async () => {
            // Chunked so a 2 MB form does not blow the argument limit.
            let bin = "";
            for (let i = 0; i < bytes.length; i += 0x8000) {
              bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            }
            return btoa(bin);
          }}
        />
      )}

      {entries.length > 0 && (
        <dl className="border-t border-border">
          {entries.map(([k, v]) => (
            <div key={k} className="border-b border-border/40 py-1.5">
              <dt className="text-[11px] text-muted-foreground" title={k}>
                {labelFor(k)}
              </dt>
              <dd className="break-words text-[12px] text-foreground">{displayValue(k, v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { answerCount } from "@/lib/form-answers";
import type { ProgramForm } from "@/lib/programs";
import { useFormProgress } from "@/hooks/useFormProgress";
import { FormDelivery } from "@/components/FormDelivery";

/**
 * The form panel's footer while the chat is filling that form: the button
 * that puts the answers on the PDF, and — once it has — the ways to take the
 * document away. Nothing while the form is not being filled.
 *
 * The filled PDF is one click away at any point: half finished is still
 * worth more than a blank form.
 */
export function FormPanelFooter({ form }: { form: ProgramForm }) {
  const { spec } = useFormProgress();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const live = spec && spec.form.id === form.id ? spec : null;
  if (!live) return null;
  const { answers } = live;
  const n = answerCount(answers);

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

  return (
    <div className="space-y-3 border-t p-4">
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
      {err && <p className="text-[11px] text-destructive">{err}</p>}
      <button
        onClick={build}
        disabled={busy || n === 0}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-3 py-2.5 text-[13px] font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {url ? "Rebuild" : "Put it on the form"}
      </button>
    </div>
  );
}

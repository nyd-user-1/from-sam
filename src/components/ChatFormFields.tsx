import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, Info, Vote } from "lucide-react";
import { toast } from "sonner";
import { optionParts, type ChatField, type FieldTone } from "@/lib/form-fields";
import { DateField } from "@/components/ui/date-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * The assistant's questions, as real controls, inline in the transcript.
 *
 * Deliberately quiet: this sits inside a message bubble, not on top of it. The
 * user can fill these in or ignore them entirely and answer in the chat box —
 * so nothing here is required, and the submit button never blocks on
 * validation. Half an answer is still an answer.
 *
 * A question does not disappear once it is answered. It folds to one muted
 * line — `Answered · 2 fields` — and opens again on a click, prefilled from
 * the record, so an earlier answer can be corrected weeks later, after a
 * reload, from the transcript where it was given. Nothing here remembers
 * whether it was sent: `answered` is derived by the page from the record.
 *
 * Values are held in the shape they are STORED (ten digits, plain money,
 * ISO dates) and shown in the shape they are TYPED — the masks below turn
 * one into the other at the edge of the input, so the record never carries
 * a formatted string the PDF adapter would have to unpick.
 */

const INPUT =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/25";

const PRIMARY =
  "inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40";

/** "First name", "First name and Last name", "First name, Middle initial and Last name". */
const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * A name box capitalises itself as it is typed (2026-09-29): "peter" reads
 * "Peter", "mary-jane" reads "Mary-Jane", "o'brien" reads "O'Brien". Only the
 * first letter of each word is touched; the rest is as typed.
 */
const isName = (f: ChatField) => /(first|middle|last)(name|initial)$|\.name$/i.test(f.key) || /\b(name|initial)\b/i.test(f.label);
const capWords = (s: string) => s.replace(/(^|[\s\-'])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());

const TRIGGER =
  "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-[13px] text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25";

/**
 * A drop-down that takes more than one answer (2026-09-29): the same box as
 * the single select, a list of check rows under it that scrolls past a few,
 * and the choices made read back in the box.
 */
function MultiSelect({
  id,
  label,
  value,
  options,
  onToggle,
}: {
  id?: string;
  label: string;
  value: string;
  options: string[];
  onToggle: (value: string) => void;
}) {
  const chosen = value.split(",").map((s) => s.trim()).filter(Boolean);
  const shown = options.map(optionParts).filter((o) => chosen.includes(o.value)).map((o) => o.label);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" id={id} aria-label={label} className={TRIGGER}>
          <span className={`min-w-0 flex-1 truncate ${shown.length ? "" : "text-muted-foreground"}`}>
            {shown.length ? shown.join(", ") : "Choose…"}
          </span>
          <ChevronDown className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-1">
        <div className="max-h-[240px] overflow-y-auto">
          {options.map((o) => {
            const { value: v, label: l } = optionParts(o);
            const on = chosen.includes(v);
            return (
              <button
                key={v}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onToggle(v)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${
                    on ? "border-foreground bg-foreground text-background" : "border-border bg-background"
                  }`}
                >
                  {on && <Check className="h-2.5 w-2.5" />}
                </span>
                <span className="truncate">{l}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const CHIP_ON = "border-foreground bg-foreground text-background";
const CHIP_OFF = "border-border text-foreground hover:bg-muted";

/** The name of the event the footer chevrons and the section menu dispatch. */
export const EXPAND_QUESTION = "expand-question";

/* ---- masks: stored ↔ typed ------------------------------------------ */

const digits = (s: string) => s.replace(/\D/g, "");

/** `5555555555` → `(555) 555-5555`, and every prefix of it as it is typed. */
function formatTel(stored: string): string {
  const d = digits(stored).slice(0, 10);
  if (d.length <= 3) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
const storeTel = (typed: string) => digits(typed).slice(0, 10);

/** `1200.5` → `1,200.5`; the `$` is drawn beside the box, never stored. */
function formatMoney(stored: string): string {
  const m = /^(\d*)(\.\d{0,2})?/.exec(stored.replace(/[^\d.]/g, "")) ?? [];
  const whole = m[1] ?? "";
  const frac = m[2] ?? "";
  return (whole ? Number(whole).toLocaleString("en-US") : "") + frac;
}
const storeMoney = (typed: string) => {
  const clean = typed.replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = clean.split(".");
  const frac = rest.length ? `.${rest.join("").slice(0, 2)}` : "";
  return whole.replace(/^0+(?=\d)/, "") + frac;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const storeEmail = (typed: string) => {
  const t = typed.trim();
  const at = t.lastIndexOf("@");
  return at > 0 ? t.slice(0, at) + t.slice(at).toLowerCase() : t;
};

/* ---- the boxed kinds: attestation and information ------------------- */

const TONE: Record<FieldTone, { box: string; title: string; icon: typeof Info }> = {
  caution: {
    box: "border-amber-400/60 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30",
    title: "Attestation",
    icon: Info,
  },
  info: {
    box: "border-blue-500/50 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950/30",
    title: "Voter registration",
    icon: Vote,
  },
};

export function ChatFormFields({
  fields,
  onSubmit,
  disabled,
  questionId,
  valueFor,
  answered = false,
  current = true,
  sectionLabel,
}: {
  fields: ChatField[];
  /** A first submit sends every filled value; a later save sends only what changed. */
  onSubmit: (values: Record<string, string>) => void;
  disabled?: boolean;
  /** Stable id; the accordion opens on an `expand-question` event carrying it. */
  questionId?: string;
  /** The recorded value for a key — the source of truth after submit and after a reload. */
  valueFor?: (key: string) => string | undefined;
  /** Derived by the page: a key has a value in the record, or an answers turn followed. */
  answered?: boolean;
  /** The last question, still open — the only one that shows Send. */
  current?: boolean;
  /** "Section 23 · 1 of 2" — what the row reads while editing. */
  sectionLabel?: string;
}) {
  const recorded = useCallback((k: string) => (valueFor?.(k) ?? "").trim(), [valueFor]);
  const fromRecord = useCallback(
    () => Object.fromEntries(fields.map((f) => [f.key, recorded(f.key) || f.value || ""])),
    [fields, recorded],
  );

  const [values, setValues] = useState<Record<string, string>>(fromRecord);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // The footer chevrons and the section menu land here. Read the record
  // fresh on the way in — local state is gone after a reload, and the record
  // may have moved on since this question was asked.
  useEffect(() => {
    if (!questionId) return;
    const onExpand = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== questionId) return;
      setValues(fromRecord());
      setOpen(true);
    };
    window.addEventListener(EXPAND_QUESTION, onExpand);
    return () => window.removeEventListener(EXPAND_QUESTION, onExpand);
  }, [questionId, fromRecord]);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const toggle = (k: string, v: string) =>
    setValues((p) => {
      const cur = (p[k] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      // "Prefer not to answer" stands alone: picking it clears the rest, and
      // picking anything else clears it.
      if (v === "skip") return { ...p, [k]: cur.includes("skip") ? "" : "skip" };
      const next = (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).filter((x) => x !== "skip");
      return { ...p, [k]: next.join(", ") };
    });

  const filled = Object.entries(values).filter(([, v]) => v.trim());
  const changed = Object.fromEntries(
    fields.filter((f) => (values[f.key] ?? "").trim() !== recorded(f.key)).map((f) => [f.key, (values[f.key] ?? "").trim()]),
  );
  const dirty = Object.keys(changed).length > 0;
  const live = current && !answered;

  const send = () => onSubmit(Object.fromEntries(filled));
  const save = () => {
    onSubmit(changed);
    setOpen(false);
  };
  // Send waits for the box to be filled in: every required field, or — when
  // nothing in it is required — at least one. Until then the button is muted,
  // and a press on it says what is missing rather than doing nothing
  // (2026-09-29).
  const required = fields.filter((f) => !f.optional);
  const missing = required.filter((f) => !(values[f.key] ?? "").trim());
  const ready = required.length ? missing.length === 0 : filled.length > 0;
  const canSend = !disabled && ready;
  const trySend = () => {
    if (disabled) return;
    if (ready) return send();
    toast(
      required.length
        ? `Fill in ${listOf(missing.map((f) => f.label))} to send, or answer in the chat box.`
        : "Fill in at least one to send, or answer in the chat box.",
    );
  };
  const canSave = !disabled && dirty;

  // Enter in a text-like box sends, once there is something to send. A
  // textarea keeps Enter for a new line; the select and the calendar handle
  // their own Enter and mark the event as used.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || e.defaultPrevented || e.shiftKey || e.metaKey || e.ctrlKey) return;
    const t = e.target as HTMLElement;
    if (t.tagName !== "INPUT") return;
    e.preventDefault();
    if (live) trySend();
    else if (canSave) save();
  };

  const control = (f: ChatField) => {
    const v = values[f.key] ?? "";
    const id = questionId ? `${questionId}-${f.key}` : undefined;
    const opts = f.options ?? [];

    if (f.kind === "textarea")
      return <textarea id={id} rows={2} className={INPUT} value={v} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />;

    if (f.kind === "select")
      return (
        <Select value={v || undefined} onValueChange={(next) => set(f.key, next)}>
          <SelectTrigger id={id} aria-label={f.label}>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => {
              const { value, label } = optionParts(o);
              return (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      );

    if (f.kind === "radio" || f.kind === "attest")
      return (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={f.label}>
          {opts.map((o) => {
            const { value, label } = optionParts(o);
            const on = v === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set(f.key, on ? "" : value)}
                className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${on ? CHIP_ON : CHIP_OFF}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      );

    if (f.kind === "checkbox") return <MultiSelect id={id} label={f.label} value={v} options={opts} onToggle={(value) => toggle(f.key, value)} />;

    if (f.kind === "date") return <DateField id={id} className={INPUT} value={v} onChange={(iso) => set(f.key, iso)} placeholder={f.placeholder} />;

    if (f.kind === "money")
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">$</span>
          <input
            id={id}
            className={`${INPUT} pl-6`}
            inputMode="decimal"
            value={formatMoney(v)}
            placeholder={f.placeholder ?? "0"}
            onChange={(e) => set(f.key, storeMoney(e.target.value))}
          />
        </div>
      );

    if (f.kind === "tel")
      return (
        <input
          id={id}
          className={INPUT}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={formatTel(v)}
          placeholder={f.placeholder ?? "(555) 555-5555"}
          onChange={(e) => set(f.key, storeTel(e.target.value))}
        />
      );

    if (f.kind === "email") {
      const bad = touched[f.key] && v.trim() !== "" && !EMAIL.test(v.trim());
      return (
        <input
          id={id}
          className={`${INPUT} ${bad ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={v}
          placeholder={f.placeholder ?? "you@example.com"}
          onChange={(e) => set(f.key, e.target.value)}
          onBlur={(e) => {
            set(f.key, storeEmail(e.target.value));
            setTouched((p) => ({ ...p, [f.key]: true }));
          }}
          aria-invalid={bad || undefined}
        />
      );
    }

    return (
      <input
        id={id}
        className={INPUT}
        type="text"
        inputMode={f.kind === "number" || f.kind === "ssn" ? "numeric" : undefined}
        // Never let a browser autofill or remember a Social Security number.
        autoComplete={f.kind === "ssn" ? "off" : undefined}
        value={v}
        placeholder={f.placeholder}
        onChange={(e) =>
          set(
            f.key,
            f.kind === "ssn" || f.kind === "number"
              ? e.target.value.replace(/[^\d.\-\s]/g, "")
              : isName(f)
                ? capWords(e.target.value)
                : e.target.value,
          )
        }
      />
    );
  };

  /** A field in its own coloured box: the title, the statement, the control, the ⓘ. */
  const boxed = (f: ChatField) => {
    const t = TONE[f.tone!];
    const Icon = t.icon;
    return (
      <div key={f.key} className={`relative rounded-lg border p-3 sm:col-span-2 ${t.box}`}>
        <div className="mb-1.5 flex items-center gap-1.5 pr-8 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
          <Icon className="h-3.5 w-3.5" />
          {t.title}
        </div>
        {f.href && (
          <a
            href={f.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Read the fine print"
            title="Read the fine print (opens in a new tab)"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-background/60 hover:text-foreground"
          >
            <Info className="h-4 w-4" />
          </a>
        )}
        {f.help && <p className="mb-2.5 text-[13px] leading-relaxed text-foreground">{f.help}</p>}
        <label htmlFor={questionId ? `${questionId}-${f.key}` : undefined} className="mb-1.5 block text-[12px] font-medium text-foreground" title={f.key}>
          {f.label}
        </label>
        {control(f)}
      </div>
    );
  };

  const controls = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" onKeyDown={onKeyDown}>
      {fields.map((f) => {
        if (f.tone) return boxed(f);
        const wide = f.kind === "textarea" || f.kind === "checkbox" || (f.options?.length ?? 0) > 3;
        const id = questionId ? `${questionId}-${f.key}` : undefined;
        return (
          <div key={f.key} className={wide ? "sm:col-span-2" : undefined}>
            <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-foreground" title={f.key}>
              {f.label}
              {f.optional && <span className="ml-1 font-normal text-muted-foreground">optional</span>}
            </label>
            {control(f)}
            {f.help && <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{f.help}</p>}
          </div>
        );
      })}
    </div>
  );

  if (live) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
        {controls}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Send"
            aria-disabled={!canSend}
            onClick={trySend}
            className={`inline-flex h-7 min-w-[72px] items-center justify-center rounded-lg text-[12px] font-medium transition-colors ${
              canSend ? "bg-foreground text-background hover:opacity-85" : "bg-muted text-muted-foreground"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          {required.length === 0 && (
            // Nothing here is required: the question can be skipped, and the
            // record says so — asked, not given (2026-09-29).
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSubmit(Object.fromEntries(fields.map((f) => [f.key, "skip"])))}
              className="inline-flex h-7 items-center justify-center rounded-lg bg-muted px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted/70 disabled:opacity-40"
            >
              Skip
            </button>
          )}
          <p className="text-[10px] text-muted-foreground">or just answer in the chat box — whatever is easier.</p>
        </div>
      </div>
    );
  }

  const n = fields.filter((f) => recorded(f.key)).length;
  const plural = (c: number) => `${c} field${c === 1 ? "" : "s"}`;
  const row = open
    ? `Editing · ${sectionLabel ?? "this question"}`
    : answered
      ? `Answered · ${plural(n)}${sectionLabel ? ` · ${sectionLabel}` : ""}`
      : `Not answered · ${plural(fields.length)}${sectionLabel ? ` · ${sectionLabel}` : ""}`;

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (open) return setOpen(false);
          setValues(fromRecord());
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
        />
        <span>{row}</span>
      </button>

      {/* The accordion: a grid row that goes 0fr → 1fr, which animates height
          without measuring it. Closed, it is also inert so nothing inside can
          take focus. */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
            {controls}
            <div className="mt-3 flex items-center gap-2">
              <button type="button" disabled={!canSave} onClick={save} className={PRIMARY}>
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-secondary px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

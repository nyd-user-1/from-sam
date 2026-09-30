import { createContext, useContext } from "react";
import type { FormAnswers } from "@/lib/form-answers";
import type { ProgramForm } from "@/lib/programs";
import type { FormNavSection } from "@/components/ChatResponseFooter";

/**
 * What the chat knows about the form it is filling, published for the form's
 * panel.
 *
 * The record is the chat page's state (saved per session there); the panel
 * that shows it is the app-shell panel beside the page. This is the wire
 * between the two: the page publishes, the panel reads, and the layout in
 * between opens the panel on the form when a filling begins (2026-09-29).
 */
export interface FormProgressSpec {
  form: ProgramForm;
  answers: FormAnswers;
  /** From formProgress in programs.ts — the page's count, not the model's. */
  progress?: { done: number; total: number; current?: string };
  /** Each asked section and what the interview has done to it. */
  sections?: FormNavSection[];
}

export interface FormProgressCtx {
  spec: FormProgressSpec | null;
  publish: (spec: FormProgressSpec | null) => void;
}

export const FormProgressContext = createContext<FormProgressCtx>({ spec: null, publish: () => {} });

export const useFormProgress = () => useContext(FormProgressContext);

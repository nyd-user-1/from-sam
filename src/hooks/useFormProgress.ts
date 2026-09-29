import { createContext, useContext } from "react";
import type { FormAnswers } from "@/lib/form-answers";
import type { ProgramForm } from "@/lib/programs";

/**
 * What the chat knows about the form it is filling, published for the rail.
 *
 * The record is the chat page's state (saved per session there); the progress
 * column is in the rail beside it. This is the wire between the two: the page
 * publishes, the rail reads, and the layout in between flips the rail onto
 * the progress page when a filling begins (2026-09-29).
 */
export interface FormProgressSpec {
  form: ProgramForm;
  answers: FormAnswers;
  /** From formProgress in programs.ts — the page's count, not the model's. */
  progress?: { done: number; total: number; current?: string };
}

export interface FormProgressCtx {
  spec: FormProgressSpec | null;
  publish: (spec: FormProgressSpec | null) => void;
}

export const FormProgressContext = createContext<FormProgressCtx>({ spec: null, publish: () => {} });

export const useFormProgress = () => useContext(FormProgressContext);

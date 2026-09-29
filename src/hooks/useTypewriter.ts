import { useEffect, useRef, useState } from "react";

/**
 * Text that arrives as it is written, shown as it is written.
 *
 * The stream lands in bursts — a few words, then a pause, then a paragraph —
 * and painting each burst whole makes the reply jump. This reveals the text
 * a few characters at a time, always chasing what has actually arrived: the
 * pace rises with the backlog, so a fast model never runs away from the
 * reader and a slow one still reads as typing. policy's chat has the same
 * effect at a fixed 25 ms a character; here the pace adapts so a long answer
 * does not trail by half a minute. When the stream ends, the whole text
 * snaps into place.
 */
export function useTypewriter(text: string, streaming: boolean): string {
  const [shown, setShown] = useState(streaming ? "" : text);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (!streaming) {
      setShown(text);
      return;
    }
    // A new answer starting: begin from nothing, not from the last one's tail.
    if (!text.startsWith(shownRef.current)) setShown("");
    const timer = setInterval(() => {
      const current = shownRef.current;
      if (current.length >= text.length) return;
      const backlog = text.length - current.length;
      // Two characters a tick at rest (~16 ms), more the further behind it is.
      const step = Math.max(2, Math.ceil(backlog / 24));
      setShown(text.slice(0, current.length + step));
    }, 16);
    return () => clearInterval(timer);
  }, [text, streaming]);

  return streaming ? shown : text;
}

"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";

interface Props {
  svgData?: string | null;
}

/**
 * Renders an AI-generated SVG diagram for a question.
 * Sanitizes via DOMPurify in the browser before injecting innerHTML.
 */
export function QuestionDiagram({ svgData }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !svgData) return;
    const clean = DOMPurify.sanitize(svgData, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ["script", "use", "animate", "set"],
      FORBID_ATTR: [
        "onclick", "onload", "onerror", "onmouseover", "onfocus",
        "onblur", "onmouseout", "onkeydown", "onkeyup",
      ],
    });
    ref.current.innerHTML = clean;
  }, [svgData]);

  if (!svgData) return null;

  return (
    <div
      ref={ref}
      className="w-full bg-white rounded-xl border border-gray-100 p-4 mb-4 flex items-center justify-center overflow-hidden"
      style={{ maxHeight: "280px" }}
      aria-label="Question diagram"
    />
  );
}

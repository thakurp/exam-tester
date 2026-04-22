"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import Image from "next/image";

interface Props {
  svgData?: string | null;
  /** SCIENCE_COMPLEX fallback: topic-level canonical image URL */
  canonicalImageUrl?: string | null;
  diagramType?: string | null;
}

/**
 * Renders an AI-generated SVG diagram for a question, or a topic-level
 * canonical image for SCIENCE_COMPLEX questions that can't use SVG.
 * SVGs are sanitized via DOMPurify in the browser before innerHTML injection.
 */
export function QuestionDiagram({ svgData, canonicalImageUrl, diagramType }: Props) {
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

  // SVG diagram takes priority
  if (svgData) {
    return (
      <div
        ref={ref}
        className="w-full bg-white rounded-xl border border-gray-100 p-4 mb-4 flex items-center justify-center overflow-hidden"
        style={{ maxHeight: "280px" }}
        aria-label="Question diagram"
      />
    );
  }

  // SCIENCE_COMPLEX fallback: show topic canonical image if available
  if (diagramType === "SCIENCE_COMPLEX" && canonicalImageUrl) {
    return (
      <div className="w-full bg-white rounded-xl border border-gray-100 p-4 mb-4 flex items-center justify-center overflow-hidden">
        <Image
          src={canonicalImageUrl}
          alt="Reference diagram"
          width={400}
          height={280}
          className="object-contain max-h-64"
          style={{ maxHeight: "280px" }}
        />
      </div>
    );
  }

  return null;
}

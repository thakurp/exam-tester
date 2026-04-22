import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize AI-generated SVG before saving to DB or rendering.
 * Strips scripts, event handlers, and external references.
 */
export function sanitizeSvg(raw: string): string {
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "use", "animate", "set"],
    FORBID_ATTR: [
      "onclick", "onload", "onerror", "onmouseover", "onfocus",
      "onblur", "onmouseout", "onkeydown", "onkeyup",
    ],
  });
}

export function isValidSvg(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith("<svg") && trimmed.includes("</svg>");
}

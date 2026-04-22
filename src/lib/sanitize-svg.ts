/**
 * Server-side SVG sanitizer — no DOM required, works in any Node.js environment.
 * Strips scripts, event handlers, javascript: hrefs, and external references.
 * The SVG source is always Claude-generated so this is a defence-in-depth measure.
 */
export function sanitizeSvg(raw: string): string {
  return raw
    // Remove <script> blocks
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Remove event-handler attributes (onclick, onload, onerror, …)
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, "")
    // Remove javascript: URIs in href / xlink:href
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, "")
    .replace(/xlink:href\s*=\s*["'][^"']*["']/gi, "")
    // Remove <use> elements (can reference external SVG symbols)
    .replace(/<use[\s\S]*?\/?>|<use[\s\S]*?<\/use>/gi, "")
    // Remove external http references in any attribute
    .replace(/=\s*["']https?:\/\/[^"']*["']/gi, '=""');
}

export function isValidSvg(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith("<svg") && trimmed.includes("</svg>");
}

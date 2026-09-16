export const MARKDOWN_COPY_TAG_ATTRIBUTE = "data-q8idevai-markdown-tag";
export const MARKDOWN_COPY_IGNORE_ATTRIBUTE = "data-q8idevai-markdown-ignore";
export const MARKDOWN_COPY_LIST_MARKER_ATTRIBUTE = "data-q8idevai-markdown-list-marker";
export const MARKDOWN_COPY_UNWRAP_ATTRIBUTE = "data-q8idevai-markdown-unwrap";
export const MARKDOWN_COPY_LIST_START_ATTRIBUTE = "data-q8idevai-markdown-list-start";
export const MARKDOWN_COPY_LANGUAGE_ATTRIBUTE = "data-q8idevai-markdown-language";
export const MARKDOWN_COPY_ALIGN_ATTRIBUTE = "data-q8idevai-markdown-align";

/**
 * Trailing line breaks, with any indentation that followed the last one.
 *
 * Both ways of copying code strip these, for the same reason: pasting a trailing
 * newline into a terminal runs the last line. A fence body always ends in one, and
 * ends in several when the author left blank lines before the closing fence; a
 * selection picks one up whenever it overshoots the end of a rendered line.
 */
export const TRAILING_CODE_LINE_BREAKS = /(\r?\n[ \t]*)+$/;

export const markdownCopyDataSet = {
  blockquote: { q8idevaiMarkdownTag: "blockquote" },
  br: { q8idevaiMarkdownTag: "br" },
  code: { q8idevaiMarkdownTag: "code" },
  h1: { q8idevaiMarkdownTag: "h1" },
  h2: { q8idevaiMarkdownTag: "h2" },
  h3: { q8idevaiMarkdownTag: "h3" },
  h4: { q8idevaiMarkdownTag: "h4" },
  h5: { q8idevaiMarkdownTag: "h5" },
  h6: { q8idevaiMarkdownTag: "h6" },
  hr: { q8idevaiMarkdownTag: "hr" },
  ignore: { q8idevaiMarkdownIgnore: "true" },
  li: { q8idevaiMarkdownTag: "li" },
  listMarker: { q8idevaiMarkdownIgnore: "true", q8idevaiMarkdownListMarker: "true" },
  ol: { q8idevaiMarkdownTag: "ol" },
  p: { q8idevaiMarkdownTag: "p" },
  pre: { q8idevaiMarkdownTag: "pre" },
  s: { q8idevaiMarkdownTag: "s" },
  strong: { q8idevaiMarkdownTag: "strong" },
  em: { q8idevaiMarkdownTag: "em" },
  table: { q8idevaiMarkdownTag: "table" },
  tbody: { q8idevaiMarkdownTag: "tbody" },
  td: { q8idevaiMarkdownTag: "td" },
  th: { q8idevaiMarkdownTag: "th" },
  thead: { q8idevaiMarkdownTag: "thead" },
  tr: { q8idevaiMarkdownTag: "tr" },
  ul: { q8idevaiMarkdownTag: "ul" },
  unwrap: { q8idevaiMarkdownUnwrap: "true" },
} as const;

export type MarkdownCopyInlineTag = "br" | "code" | "em" | "s" | "strong";

export function markdownCopyOrderedListDataSet(start: unknown) {
  return {
    ...markdownCopyDataSet.ol,
    q8idevaiMarkdownListStart: String(start ?? 1),
  } as const;
}

export function markdownCopyCodeBlockDataSet(language: string | null | undefined) {
  const fenceLanguage = language?.trim().split(/\s+/)[0];
  return {
    ...markdownCopyDataSet.pre,
    ...(fenceLanguage ? { q8idevaiMarkdownLanguage: fenceLanguage } : {}),
  } as const;
}

export function markdownCopyTableCellDataSet(tag: "td" | "th", style: unknown) {
  const alignment =
    typeof style === "string"
      ? style.match(/(?:^|;)\s*text-align\s*:\s*(left|right|center)/i)?.[1]
      : null;
  return {
    ...markdownCopyDataSet[tag],
    ...(alignment ? { q8idevaiMarkdownAlign: alignment.toLowerCase() } : {}),
  } as const;
}

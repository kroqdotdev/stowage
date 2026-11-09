import * as React from "react";

/*
  Release notes arrive as the Markdown of a CHANGELOG section. We render the
  handful of constructs it uses (headings, bullets, paragraphs, inline code)
  and show anything else as plain text, so nothing from GitHub becomes HTML.
*/

function inline(text: string, key: string): React.ReactNode {
  // Links keep their text, emphasis markers are dropped; both would
  // otherwise show as raw Markdown.
  const plain = text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1");
  const parts = plain.split(/(`[^`]+`)/g);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code
        key={`${key}-${index}`}
        className="rounded-xs bg-secondary px-1 py-px font-mono text-[12px]"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      <React.Fragment key={`${key}-${index}`}>{part}</React.Fragment>
    ),
  );
}

export function ReleaseNotes({
  notes,
  className,
}: {
  notes: string;
  className?: string;
}) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    const key = `ul-${blocks.length}`;
    blocks.push(
      <ul key={key} className="list-disc space-y-1 pl-5">
        {bullets.map((item, index) => (
          <li key={index}>{inline(item, `${key}-${index}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const key = `p-${blocks.length}`;
    blocks.push(<p key={key}>{inline(paragraph.join(" "), key)}</p>);
    paragraph = [];
  };

  for (const raw of notes.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (heading) {
      flushBullets();
      flushParagraph();
      const title = heading[2].replace(/^\[([^\]]+)\].*$/, "$1");
      blocks.push(
        <p
          key={`h-${blocks.length}`}
          className="pt-1 text-[12px] font-semibold tracking-wide text-ink-2 uppercase"
        >
          {inline(title, `h-${blocks.length}`)}
        </p>,
      );
    } else if (bullet) {
      flushParagraph();
      bullets.push(bullet[1]);
    } else if (!line.trim()) {
      flushBullets();
      flushParagraph();
    } else {
      flushBullets();
      paragraph.push(line.trim());
    }
  }
  flushBullets();
  flushParagraph();

  if (!blocks.length) {
    return (
      <p className={className}>
        <span className="text-muted-foreground">
          No notes for this release.
        </span>
      </p>
    );
  }
  return <div className={className}>{blocks}</div>;
}

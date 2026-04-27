export function formatGeneratedCommitMessage(message: string, maxTitleLength: number): string {
  const unfencedMessage = stripOuterCodeFence(message);
  const lines = unfencedMessage.split(/\r?\n/);
  const firstLine = lines[0] ?? '';

  if (firstLine.length > maxTitleLength) {
    lines[0] = firstLine.substring(0, maxTitleLength);
  }

  return lines.join('\n');
}

function stripOuterCodeFence(message: string): string {
  const trimmedMessage = message.trim();
  const lines = trimmedMessage.split(/\r?\n/);
  const openingFenceIndex = lines.findIndex(line => isFenceOpeningLine(line));

  if (openingFenceIndex !== -1) {
    const contentLines = lines.slice(openingFenceIndex + 1);
    const closingFenceIndex = contentLines.findIndex(line => isFenceClosingLine(line));

    const fencedContentLines = closingFenceIndex === -1
      ? contentLines
      : contentLines.slice(0, closingFenceIndex);

    return fencedContentLines.join('\n').trim();
  }

  return trimmedMessage;
}

function isFenceOpeningLine(line: string): boolean {
  return /^```[^`]*$/.test(line.trim());
}

function isFenceClosingLine(line: string): boolean {
  return /^```\s*$/.test(line.trim());
}

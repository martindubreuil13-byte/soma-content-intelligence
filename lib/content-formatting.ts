import type { ContentChannel } from "@/lib/content-types";

const channelHeadingPatterns: Record<ContentChannel, RegExp> = {
  linkedin: /linkedin\s+post/i,
  facebook: /facebook\s+post/i,
  instagram: /instagram\s+(post|caption)/i,
  tiktok: /tiktok\s+caption/i
};

const headingLinePattern = /^\s*(?:#{1,6}\s*)?(?:\d+\.\s*)?(?:\*\*)?\s*(linkedin\s+post|facebook\s+post|instagram\s+(?:post|caption)|tiktok\s+caption)(?:\*\*)?\s*:?\s*$/i;

function getChannelFromHeading(line: string) {
  const normalizedLine = line.replace(/[*#]/g, "").trim();
  const channel = (Object.keys(channelHeadingPatterns) as ContentChannel[]).find((key) =>
    channelHeadingPatterns[key].test(normalizedLine)
  );

  return channel ?? null;
}

export function splitContentByChannel(content: string) {
  const sections: Partial<Record<ContentChannel, string>> = {};
  const lines = content.split(/\r?\n/);
  let activeChannel: ContentChannel | null = null;
  let buffer: string[] = [];

  function commitSection() {
    if (!activeChannel) {
      return;
    }

    const sectionContent = buffer.join("\n").trim();

    if (sectionContent) {
      sections[activeChannel] = sectionContent;
    }
  }

  for (const line of lines) {
    if (headingLinePattern.test(line)) {
      commitSection();
      activeChannel = getChannelFromHeading(line);
      buffer = [];
      continue;
    }

    if (activeChannel) {
      buffer.push(line);
    }
  }

  commitSection();

  return sections;
}

export function containsMultipleChannelHeadings(content: string) {
  const matches = content.match(new RegExp(headingLinePattern.source, "gim"));
  return (matches?.length ?? 0) > 1;
}

export function cleanChannelContent(content: string, channel: ContentChannel) {
  const labelPatternByChannel: Record<ContentChannel, string> = {
    linkedin: "LinkedIn\\s+Post",
    facebook: "Facebook\\s+Post",
    instagram: "Instagram\\s+(?:Post|Caption)",
    tiktok: "TikTok\\s+Caption"
  };
  const leadingHeadingPattern = new RegExp(
    `^\\s*(?:#{1,6}\\s*)?(?:\\d+\\.\\s*)?(?:\\*\\*)?\\s*${labelPatternByChannel[channel]}(?:\\*\\*)?\\s*:?\\s*\\n+`,
    "i"
  );

  return content
    .replace(/\r\n/g, "\n")
    .replace(leadingHeadingPattern, "")
    .replace(/^\s*---+\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const EMAIL_FOOTER = [
  "Best regards,",
  "Dewald Van Niekerk",
  "Head of Sales",
  "dewald.vanniekerk@mediamark.co.za",
].join("\n");

const SUBJECT_PREFIX_RE = /^subject\s*:\s*/i;
const BODY_PREFIX_RE = /^body\s*:\s*/i;
const FOOTER_START_RE = /best\s+regards,?/gi;
const CTA_START_RE = /^(would|could|perhaps|maybe|are you|do you|is it|would it|could it)\b/i;
const PARAGRAPH_START_RE =
  /^(we work|that's where|that is where|the proof point|the wepner|wepner|for a recent|the balance|perion|mediamark|outmax)\b/i;

/**
 * @param {{ subject?: string | null, body?: string | null }} draft
 * @returns {{ subject: string, body: string }}
 */
function normalizeDraftEmail(draft) {
  const stripped = stripLeadingLabels(String(draft.body ?? ""));
  const subject = normalizeSubject(draft.subject, stripped.subjectCandidate);
  const bodyWithoutFooter = removeExistingFooter(stripped.body);
  const body = formatBody(bodyWithoutFooter);

  return {
    subject,
    body: body ? `${body}\n\n${EMAIL_FOOTER}` : EMAIL_FOOTER,
  };
}

function normalizeSubject(subject, fallback) {
  const firstLine = String(subject ?? fallback ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")[0]
    .replace(SUBJECT_PREFIX_RE, "")
    .trim();

  return firstLine.replace(/^["']|["']$/g, "");
}

function stripLeadingLabels(rawBody) {
  const lines = rawBody.replace(/\r\n?/g, "\n").split("\n");
  const kept = [];
  let subjectCandidate = "";
  let hasStarted = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!hasStarted && !trimmed) continue;

    if (!hasStarted && SUBJECT_PREFIX_RE.test(trimmed)) {
      subjectCandidate = trimmed.replace(SUBJECT_PREFIX_RE, "").trim();
      continue;
    }

    if (!hasStarted && BODY_PREFIX_RE.test(trimmed)) {
      const withoutLabel = trimmed.replace(BODY_PREFIX_RE, "").trim();
      if (withoutLabel) kept.push(withoutLabel);
      hasStarted = true;
      continue;
    }

    hasStarted = true;
    kept.push(line);
  }

  return {
    subjectCandidate,
    body: kept.join("\n").trim(),
  };
}

function removeExistingFooter(body) {
  const matches = [...body.matchAll(FOOTER_START_RE)];
  if (matches.length === 0) return body.trim();

  const lastFooter = matches[matches.length - 1];
  return body.slice(0, lastFooter.index).trim();
}

function formatBody(body) {
  const paragraphs = toParagraphs(body);

  if (paragraphs.length === 0) return "";
  if (paragraphs.length > 1) return paragraphs.join("\n\n");

  return reflowSingleParagraph(paragraphs[0]).join("\n\n");
}

function toParagraphs(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function reflowSingleParagraph(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const greetingMatch = normalized.match(/^(hi|hello|dear)\s+[^,]+,\s*/i);
  const blocks = [];
  let remaining = normalized;

  if (greetingMatch) {
    blocks.push(greetingMatch[0].trim());
    remaining = normalized.slice(greetingMatch[0].length).trim();
  }

  const sentences = splitSentences(remaining);
  if (sentences.length === 0) return blocks;

  const finalSentence = sentences[sentences.length - 1];
  const cta = CTA_START_RE.test(finalSentence) ? sentences.pop() : "";
  const grouped = groupSentences(sentences);

  blocks.push(...grouped);
  if (cta) blocks.push(cta);

  return blocks;
}

function splitSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+(?=(?:["'([])?[A-Z])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function groupSentences(sentences) {
  const groups = [];
  let current = [];

  for (const sentence of sentences) {
    const nextText = [...current, sentence].join(" ");
    const startsNewParagraph = current.length > 0 && PARAGRAPH_START_RE.test(sentence);
    const isTooLong = current.length > 0 && wordCount(nextText) > 58;
    const hasEnoughSentences = current.length >= 2;

    if (startsNewParagraph || isTooLong || hasEnoughSentences) {
      groups.push(current.join(" "));
      current = [];
    }

    current.push(sentence);
  }

  if (current.length > 0) groups.push(current.join(" "));
  return groups;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

exports.EMAIL_FOOTER = EMAIL_FOOTER;
exports.normalizeDraftEmail = normalizeDraftEmail;

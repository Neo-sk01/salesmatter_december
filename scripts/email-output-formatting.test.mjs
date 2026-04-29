import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EMAIL_FOOTER,
  normalizeDraftEmail,
} from "../lib/agents/email-output-formatting.js";

test("formats one-paragraph AI output into readable email blocks", () => {
  const result = normalizeDraftEmail({
    subject: "Subject: Media efficiency for Cellulant",
    body: "Subject: Media efficiency for Cellulant\n\nHi Peter, I saw Cellulant's recent expansion across 18 African markets and the new leadership appointments. It feels like your team is focused on scaling efficiently while maintaining performance accountability. We work with marketing and performance teams at pan-African brands that are managing spend across YouTube, Meta, TikTok, CTV, and programmatic. The difficult part is often knowing where the next dollar should go while a campaign is live. That's where our partnership comes in. Mediamark brings Outmax, Perion's AI execution agent, to African advertisers. The proof point for us is Wepner. Their campaign achieved a 96% YouTube completion rate and a 7.65% engagement rate on Meta. Would you be open to a short conversation to see if this approach could support Cellulant's current media priorities?",
  });

  assert.equal(result.subject, "Media efficiency for Cellulant");
  assert.ok(!result.body.startsWith("Subject:"));
  assert.match(result.body, /^Hi Peter,\n\n/);
  assert.match(result.body, /\n\nWe work with marketing/);
  assert.match(result.body, /\n\nThat's where our partnership/);
  assert.match(result.body, /7\.65% engagement rate/);
  assert.match(result.body, /\n\nWould you be open/);
  assert.ok(result.body.endsWith(EMAIL_FOOTER));
});

test("preserves existing paragraph breaks and normalizes duplicate footer", () => {
  const result = normalizeDraftEmail({
    subject: "Outmax for TymeBank",
    body: "Hi Lucia,\n\nI saw TymeBank's recent growth to 15 million customers.\n\nWould it be worth a short conversation?\n\nBest regards, Dewald Van Niekerk Head of Sales dewald.vanniekerk@mediamark.co.za",
  });

  assert.equal(
    result.body,
    "Hi Lucia,\n\nI saw TymeBank's recent growth to 15 million customers.\n\nWould it be worth a short conversation?\n\n" + EMAIL_FOOTER,
  );
});

// Verify lib/services/instantly.ts works end-to-end against the real Instantly API.
// Sends a test email to neosekaleli@gmail.com using the actual library helpers.
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
    createCampaign,
    addLeadToCampaign,
    activateCampaign,
} from "../lib/services/instantly";

async function main() {
    const recipient = "neosekaleli@gmail.com";
    const subject = "Instantly API test from Salesmatter (lib path)";
    const body =
        "Hi Neo,\n\nThis send went through lib/services/instantly.ts after the " +
        "tz + activate fixes. If you're reading this, both bugs are gone.\n\n—Salesmatter";
    const campaignName = `Salesmatter lib test ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;

    console.log("[1/3] createCampaign");
    const campaign = await createCampaign({
        name: campaignName,
        sequenceSubject: subject,
        sequenceBody: "{{personalization}}",
    });
    console.log("    -> campaign id:", campaign.id);

    console.log("[2/3] addLeadToCampaign");
    const lead = await addLeadToCampaign({
        campaignId: campaign.id,
        email: recipient,
        firstName: "Neo",
        personalization: body,
    });
    console.log("    -> lead id:", lead.id);

    console.log("[3/3] activateCampaign");
    await activateCampaign(campaign.id);
    console.log("    -> activated");

    console.log(
        `\nDone. Campaign ${campaign.id} live with one lead (${recipient}). ` +
        "Library helpers worked end-to-end.",
    );
}

main().catch((err) => {
    console.error("FAILED:", err);
    process.exit(1);
});

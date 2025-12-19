
import { ChatOpenAI } from "@langchain/openai";
import { ImportedLead } from "@/types";
import { z } from "zod";
import { CallbackHandler } from "langfuse-langchain";

const emailSchema = z.object({
    subject: z.string().describe("The subject line of the email"),
    body: z.string().describe("The main body content of the email"),
});

export async function draftEmail(
    lead: ImportedLead,
    researchSummary: string,
    userPrompt: string
) {
    const handler = new CallbackHandler({
        userId: "system",
    });

    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.7,
        callbacks: [handler],
    });

    const structuredModel = model.withStructuredOutput(emailSchema);

    const fullPrompt = `
    You are an expert sales copywriter.
    
    User Prompt / Instructions:
    ${userPrompt}

    Lead Info:
    - Name: ${lead.firstName} ${lead.lastName}
    - Company: ${lead.company}
    - Role: ${lead.role}
    
    Research Summary:
    ${researchSummary}
    
    Task: Write a cold outreach email based on the above.
  `;

    const result = await structuredModel.invoke(fullPrompt);
    return result;
}

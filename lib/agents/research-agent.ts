
import { ChatOpenAI } from "@langchain/openai";
import { ImportedLead } from "@/types";
import { CallbackHandler } from "langfuse-langchain";

export async function researchLead(lead: ImportedLead): Promise<string> {
    const handler = new CallbackHandler({
        userId: "system", // or dynamic user id
    });

    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0,
        callbacks: [handler],
    });

    // In a real scenario, this would use a Search Tool (e.g., Tavily, SerpAPI)
    // Since we don't have a guaranteed search API key, we will simulate "knowledge" 
    // or use the model's internal knowledge extended with specific prompt instructions.
    // Ideally, we would stick a tool.invoke() here.

    // Placeholder for search results
    const mockSearchResults = `
    Recent news for ${lead.company}:
    - Launched a new product feature last month.
    - Expanded to a new region.
    - ${lead.firstName} ${lead.lastName} posted about leadership on LinkedIn.
  `;

    const prompt = `
    You are a researcher.Your goal is to research a prospect for cold outreach.

    Prospect:
    - Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company}
- Role: ${lead.role}
    
    Context found:
    ${mockSearchResults}

Task: Write a 150 - word summary of this person / company focusing on recent activity, news, or personal professional updates that can be used as a hook in an email.
  `;

    const response = await model.invoke(prompt);
    return response.content.toString();
}

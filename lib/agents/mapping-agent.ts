
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const mappingSchema = z.object({
  firstName: z.string().describe("Column name for First Name"),
  lastName: z.string().describe("Column name for Last Name"),
  email: z.string().describe("Column name for Email"),
  company: z.string().describe("Column name for Company Name"),
  linkedin: z.string().nullable().optional().describe("Column name for LinkedIn URL"),
  companyUrl: z.string().nullable().optional().describe("Column name for Company Website URL"),
  role: z.string().nullable().optional().describe("Column name for Job Title / Role"),
});

export type MappingResult = z.infer<typeof mappingSchema>;

export async function identifyColumns(
  headers: string[],
  sampleRows: any[]
): Promise<MappingResult> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  });

  const structuredModel = model.withStructuredOutput(mappingSchema);

  const prompt = `
    You are a data mapping assistant. Match the following CSV headers to the standard fields:
    - firstName
    - lastName
    - email
    - company
    - linkedin (optional - LinkedIn profile URL)
    - companyUrl (optional - Company website URL)
    - role (optional)

    Headers: ${JSON.stringify(headers)}
    Sample Data (first 3 rows): ${JSON.stringify(sampleRows.slice(0, 3))}

    Return the exact header name from the provided list that best matches each standard field.
    If no match is found for a required field, pick the closest one or empty string if totally ambiguous.
  `;

  const result = await structuredModel.invoke(prompt);
  return result;
}

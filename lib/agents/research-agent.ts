import { generateText } from 'ai';
import { TavilySearch } from '@langchain/tavily';
import { ImportedLead } from '@/types';
import { getModel } from '@/lib/ai/openrouter';
import { parseAIError } from '@/lib/ai/errors';

export interface ResearchResult {
    summary: string;
    sources: { title: string; url: string }[];
}

export async function researchLead(lead: ImportedLead): Promise<ResearchResult> {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
        throw new Error('TAVILY_API_KEY not found in environment');
    }

    const linkedinContext = lead.linkedinUrl ? `- LinkedIn Profile: ${lead.linkedinUrl}` : '';
    const companyUrlContext = lead.companyUrl ? `- Company Website: ${lead.companyUrl}` : '';

    const customFieldsText = Object.entries(lead.customFields || {})
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');

    const searchQueries: string[] = [
        `${lead.company} company news announcements`,
        `${lead.firstName} ${lead.lastName} ${lead.company} ${lead.role}`,
    ];

    if (lead.companyUrl) {
        searchQueries.push(`site:${lead.companyUrl} about products services`);
    }

    if (lead.linkedinUrl) {
        searchQueries.push(`${lead.firstName} ${lead.lastName} LinkedIn professional`);
    }

    console.log('Using Tavily search with queries:');
    searchQueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

    try {
        const searchTool = new TavilySearch({
            tavilyApiKey: tavilyApiKey,
            maxResults: 5,
        });

        const allResults: { title: string; url: string; content: string }[] = [];
        const sources: { title: string; url: string }[] = [];

        for (const query of searchQueries) {
            try {
                const result = await searchTool.invoke({ query });

                let parsedResult;
                if (typeof result === 'string') {
                    try {
                        parsedResult = JSON.parse(result);
                    } catch {
                        allResults.push({ title: query, url: '', content: result });
                        continue;
                    }
                } else {
                    parsedResult = result;
                }

                if (Array.isArray(parsedResult)) {
                    for (const item of parsedResult) {
                        allResults.push({
                            title: item.title || '',
                            url: item.url || '',
                            content: item.content || item.snippet || '',
                        });
                        if (item.url) {
                            sources.push({
                                title: item.title || item.url,
                                url: item.url,
                            });
                        }
                    }
                } else if (parsedResult.results && Array.isArray(parsedResult.results)) {
                    for (const item of parsedResult.results) {
                        allResults.push({
                            title: item.title || '',
                            url: item.url || '',
                            content: item.content || item.snippet || '',
                        });
                        if (item.url) {
                            sources.push({
                                title: item.title || item.url,
                                url: item.url,
                            });
                        }
                    }
                }
            } catch (searchError: any) {
                console.warn(
                    `Search query failed: ${query} - ${searchError?.statusText || searchError?.message || 'Unknown error'}`,
                );
                if (
                    searchError?.status === 429 ||
                    searchError?.statusText === 'Too Many Requests' ||
                    searchError?.message?.includes('429')
                ) {
                    console.log('Tavily rate limit reached. Stopping further queries.');
                    break;
                }
            }
        }

        console.log(`Tavily search completed. Found ${allResults.length} results from ${sources.length} sources`);

        if (allResults.length === 0) {
            throw new Error('No search results found from any query.');
        }

        const uniqueSources = sources.filter(
            (source, index, self) => index === self.findIndex((s) => s.url === source.url),
        );

        const searchContext = allResults
            .map((r) => `[${r.title}]\n${r.content}`)
            .join('\n\n---\n\n');

        const summaryPrompt = `
You are a researcher preparing context for cold outreach. Based on the web search results provided, write a focused summary.

Prospect Details:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company}
- Role: ${lead.role}
${linkedinContext}
${companyUrlContext}
${customFieldsText}

WEB SEARCH RESULTS:
${searchContext || 'No search results found.'}

Write a focused 150-word summary that includes:
- Recent company news, announcements, or achievements
- Company initiatives, products, or services
- Information about ${lead.firstName} ${lead.lastName} - their role, professional updates, or thought leadership
- Any conversation hooks that would be relevant for cold outreach

Be factual and specific. Only include information that appears in the search results above.
If no relevant information was found, state that clearly and provide general context based on the role/industry.
`;

        const { text: summary } = await generateText({
            model: getModel('research'),
            prompt: summaryPrompt,
            temperature: 0.3,
        });

        console.log('Tavily research completed successfully');

        return {
            summary: summary || 'No summary generated',
            sources: uniqueSources,
        };
    } catch (error) {
        console.error('Tavily search failed:', error);
        console.log('Falling back to basic research summary without web search');

        const fallbackPrompt = `
You are a researcher preparing context for cold outreach.

Prospect:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company}
- Role: ${lead.role}
${linkedinContext}
${companyUrlContext}
${customFieldsText}

Task: Write a focused 150-word summary of this person/company based on your knowledge.
Focus on:
- Known information about the company
- Industry context and typical roles
- Anything that could serve as a conversation hook

Be factual and specific where possible. If you don't have specific information,
focus on general industry knowledge that might be relevant.
`;

        try {
            const { text: fallbackSummary } = await generateText({
                model: getModel('research'),
                prompt: fallbackPrompt,
                temperature: 0,
            });

            return {
                summary: fallbackSummary || 'No summary generated',
                sources: [],
            };
        } catch (fallbackError) {
            console.error('Research fallback failed:', fallbackError);
            throw parseAIError(fallbackError);
        }
    }
}

/**
 * Everlytic Email Service
 * Handles sending transactional emails via Everlytic API
 */

export interface EmailParams {
    to: string;
    subject: string;
    body: string;
}

export interface EmailSendResult {
    success: boolean;
    error?: string;
    details?: any;
}

export async function sendEmail(params: EmailParams): Promise<EmailSendResult> {
    try {
        const { to, subject, body } = params;

        // Get credentials from environment
        const username = process.env.EVERLYTIC_USERNAME;
        const password = process.env.EVERLYTIC_PASSWORD;
        const senderEmail = process.env.EVERLYTIC_SENDER_EMAIL;
        const apiUrl = process.env.EVERLYTIC_API_URL;

        if (!username || !password || !senderEmail || !apiUrl) {
            throw new Error("Missing Everlytic configuration in environment variables");
        }

        // Create Basic Auth header
        const authString = Buffer.from(`${username}:${password}`).toString("base64");

        // Construct request body per Everlytic API format
        const requestBody = {
            headers: {
                from: senderEmail,
                to: to,
                subject: subject,
            },
            body: {
                html: body,
                text: body.replace(/<[^>]*>/g, ""), // Simple HTML to text conversion
            },
            attachments: [],
        };

        // Make API request
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${authString}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `Everlytic API error: ${response.status} - ${errorText}`,
            };
        }

        const result = await response.json();
        return {
            success: true,
            details: result,
        };
    } catch (error) {
        console.error("Error sending email via Everlytic:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

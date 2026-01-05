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
                reply_to: senderEmail,
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

export interface WebhookRegistrationResult {
    success: boolean;
    error?: string;
    details?: any;
}

export async function registerWebhook(): Promise<WebhookRegistrationResult> {
    try {
        const username = process.env.EVERLYTIC_USERNAME;
        const password = process.env.EVERLYTIC_PASSWORD;

        // Webhook specific credentials for basic auth, fallback to main creds if not set
        const webhookUsername = process.env.EVERLYTIC_WEBHOOK_USERNAME || username;
        const webhookPassword = process.env.EVERLYTIC_WEBHOOK_PASSWORD || password;

        // Default to localhost for development if not set, but warn
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        if (!username || !password || !webhookUsername || !webhookPassword) {
            throw new Error("Missing required Everlytic credentials in environment variables");
        }

        const authString = Buffer.from(`${username}:${password}`).toString("base64");
        const webhookUrl = `${appUrl}/api/everlytic/webhook`;

        const payload = {
            event_types: ["sent", "delivered", "failed", "open", "click", "bounce", "unsubscribe", "resubscribe"],
            url: webhookUrl,
            verb: "post",
            auth_details: {
                username: webhookUsername,
                password: webhookPassword
            },
            auth_type: "basic",
            content_type: "application/json",
            field_set: "standard",
            settings: {
                include_html: false
            }
        };

        const response = await fetch("https://api.everlytic.net/transactional/email/v1/webhooks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${authString}`,
            },
            body: JSON.stringify(payload),
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
        console.error("Error registering webhook:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

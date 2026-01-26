/**
 * Everlytic Email Service
 * Handles sending transactional emails via Everlytic API
 * Uses Node.js https module with IPv4 to avoid connection timeout issues
 */

import https from "https";

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

// Helper function to make HTTPS requests with IPv4 preference
function httpsRequest(
    url: string,
    options: https.RequestOptions,
    data: string,
    timeoutMs: number = 30000
): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        const req = https.request(
            {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: options.method || "POST",
                headers: options.headers,
                family: 4, // Force IPv4
                timeout: timeoutMs,
            },
            (res) => {
                let body = "";
                res.on("data", (chunk) => (body += chunk));
                res.on("end", () => {
                    resolve({ statusCode: res.statusCode || 500, body });
                });
            }
        );

        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
        });

        req.write(data);
        req.end();
    });
}

export async function sendEmail(params: EmailParams): Promise<EmailSendResult> {
    const { to, subject, body } = params;

    // Get credentials from environment
    const username = process.env.EVERLYTIC_USERNAME;
    const password = process.env.EVERLYTIC_PASSWORD;
    const senderEmail = process.env.EVERLYTIC_SENDER_EMAIL;
    const apiUrl = process.env.EVERLYTIC_API_URL;

    if (!username || !password || !senderEmail || !apiUrl) {
        return {
            success: false,
            error: "Missing Everlytic configuration in environment variables",
        };
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
            html: (body || "").replace(/\n/g, "<br/>"),
            text: (body || "").replace(/<[^>]*>/g, ""),
        },
        attachments: [],
    };

    console.log('[everlytic-send] API URL:', apiUrl);
    console.log('[everlytic-send] Request body:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await httpsRequest(
            apiUrl,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${authString}`,
                },
            },
            JSON.stringify(requestBody)
        );

        console.log('[everlytic-send] Response status:', response.statusCode);
        console.log('[everlytic-send] Response body:', response.body);

        if (response.statusCode >= 400) {
            return {
                success: false,
                error: `Everlytic API error: ${response.statusCode} - ${response.body}`,
            };
        }

        const result = JSON.parse(response.body);
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
    const username = process.env.EVERLYTIC_USERNAME;
    const password = process.env.EVERLYTIC_PASSWORD;

    const webhookUsername = process.env.EVERLYTIC_WEBHOOK_USERNAME || username;
    const webhookPassword = process.env.EVERLYTIC_WEBHOOK_PASSWORD || password;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!username || !password || !webhookUsername || !webhookPassword) {
        return {
            success: false,
            error: "Missing required Everlytic credentials in environment variables",
        };
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

    try {
        const response = await httpsRequest(
            "https://api.everlytic.net/transactional/email/v1/webhooks",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${authString}`,
                },
            },
            JSON.stringify(payload)
        );

        if (response.statusCode >= 400) {
            return {
                success: false,
                error: `Everlytic API error: ${response.statusCode} - ${response.body}`,
            };
        }

        const result = JSON.parse(response.body);
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

export interface ReprocessResult {
    success: boolean;
    error?: string;
    details?: any;
}

/**
 * Reprocess failed webhook events from the last 7 days
 * Everlytic automatically retries in 5-min intervals for 3 days,
 * but this endpoint can recover events that failed after that period
 */
export async function reprocessFailedWebhooks(): Promise<ReprocessResult> {
    const username = process.env.EVERLYTIC_USERNAME;
    const password = process.env.EVERLYTIC_PASSWORD;

    if (!username || !password) {
        return {
            success: false,
            error: "Missing Everlytic credentials in environment variables",
        };
    }

    const authString = Buffer.from(`${username}:${password}`).toString("base64");

    try {
        const response = await httpsRequest(
            "https://api.everlytic.net/transactional/email/v1/webhooks/failed/reprocess",
            {
                method: "GET",
                headers: {
                    Authorization: `Basic ${authString}`,
                },
            },
            "",
            60000 // 60 second timeout for reprocessing
        );

        console.log('[everlytic] Reprocess failed webhooks response:', response.statusCode, response.body);

        if (response.statusCode >= 400) {
            return {
                success: false,
                error: `Everlytic API error: ${response.statusCode} - ${response.body}`,
            };
        }

        const result = JSON.parse(response.body);
        return {
            success: result.status === true,
            details: result,
        };
    } catch (error) {
        console.error("Error reprocessing failed webhooks:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

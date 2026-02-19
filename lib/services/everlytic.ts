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
    bcc?: string;
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
    const { to, subject, body, bcc } = params;

    // Validate required fields
    if (!to || !to.trim()) {
        return {
            success: false,
            error: "Recipient email address is required",
        };
    }

    if (!subject || !subject.trim()) {
        return {
            success: false,
            error: "Email subject is required",
        };
    }

    if (!body || !body.trim()) {
        return {
            success: false,
            error: "Email body is required",
        };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
        return {
            success: false,
            error: `Invalid email address: ${to}`,
        };
    }

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

    // Auto-BCC the sender so they receive a copy in their inbox
    const bccAddress = bcc || senderEmail;

    // Construct request body per Everlytic API format
    const requestBody = {
        headers: {
            from: senderEmail,
            to: to.trim(),
            subject: subject.trim(),
            reply_to: senderEmail,
            bcc: bccAddress,
        },
        body: {
            html: (body || "").replace(/\n/g, "<br/>"),
            text: (body || "").replace(/<[^>]*>/g, ""),
        },
        attachments: [],
    };

    console.log('[everlytic-send] API URL:', apiUrl);
    console.log('[everlytic-send] Sending to:', to);
    console.log('[everlytic-send] Subject:', subject);

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

        // Try to parse the response body
        let parsedBody: any = null;
        try {
            parsedBody = JSON.parse(response.body);
        } catch {
            // If we can't parse, it's probably an error
        }

        // Everlytic sometimes returns 400 errors but still sends the email
        // Check for indicators of success in the response body
        const hasMessageId = parsedBody?.data?.message_id || parsedBody?.message_id;
        const hasAccepted = parsedBody?.data?.accepted || parsedBody?.accepted;

        // If we have a message_id or accepted indicator, treat as success despite status code
        if (hasMessageId || hasAccepted) {
            console.log('[everlytic-send] Email accepted with message_id:', hasMessageId);
            return {
                success: true,
                details: parsedBody,
            };
        }

        if (response.statusCode >= 400) {
            // Check if there's an error in the body
            const errorCode = parsedBody?.error?.code;

            // For codes 10601/10900, the email often still goes through
            // Log as warning but return success with warning flag
            if (errorCode === "10601" || errorCode === "10900") {
                console.warn('[everlytic-send] Everlytic returned error code', errorCode, 'but email may have been sent');
                // Since user confirmed emails are delivered, treat these as success with warning
                return {
                    success: true,
                    details: {
                        warning: `Everlytic returned code ${errorCode}, but email was likely sent. Check your inbox.`,
                        ...parsedBody
                    },
                };
            }

            // For other errors, parse and return user-friendly message
            const userError = parseEverlyticError(response.body, response.statusCode);
            return {
                success: false,
                error: userError,
            };
        }

        return {
            success: true,
            details: parsedBody,
        };
    } catch (error) {
        console.error("Error sending email via Everlytic:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// Parse Everlytic API errors into user-friendly messages
function parseEverlyticError(responseBody: string, statusCode: number): string {
    try {
        const parsed = JSON.parse(responseBody);
        const errorCode = parsed?.error?.code;
        const errorMessage = parsed?.error?.message;

        // Map known Everlytic error codes to user-friendly messages
        switch (errorCode) {
            case "10601":
            case "10900":
                // These are generic errors - often means domain not verified or sender issue
                return `Email could not be sent. Please verify that the sender domain (${process.env.EVERLYTIC_SENDER_EMAIL || 'unknown'}) is properly configured in Everlytic.`;
            case "10602":
                return "Invalid recipient email address.";
            case "10603":
                return "Email content validation failed. Please check your email for invalid characters.";
            case "10604":
                return "Sender email address is not authorized. Please check your Everlytic sender settings.";
            default:
                if (errorMessage) {
                    return `Email sending failed: ${errorMessage}`;
                }
                return `Everlytic API error (${statusCode}): Unable to send email. Please try again.`;
        }
    } catch {
        return `Everlytic API error (${statusCode}): Unable to send email. Please try again.`;
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

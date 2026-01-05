'use server'

import { registerWebhook } from "@/lib/services/everlytic";

export async function registerWebhookAction() {
    return await registerWebhook();
}

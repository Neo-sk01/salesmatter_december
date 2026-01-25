"use server"

import { reprocessFailedWebhooks } from "@/lib/services/everlytic";

export async function reprocessWebhooksAction() {
    return await reprocessFailedWebhooks();
}

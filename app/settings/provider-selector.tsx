"use client";

import { useTransition } from "react";
import { setAiProvider, AiProvider } from "@/lib/actions/settings";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProviderSelector({ initialProvider }: { initialProvider: AiProvider }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSelect = (provider: AiProvider) => {
        if (provider === initialProvider) return;
        startTransition(async () => {
            await setAiProvider(provider);
            router.refresh();
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-lg">AI Generation Settings</h2>
            <p className="text-muted-foreground text-sm">
                Choose the fallback AI provider for email drafting and research summarization.
            </p>
            <div className="flex gap-4 mt-2">
                <Button
                    variant={initialProvider === "openai" ? "default" : "outline"}
                    onClick={() => handleSelect("openai")}
                    disabled={isPending}
                >
                    Current Implementation (OpenAI Direct)
                </Button>
                <Button
                    variant={initialProvider === "gateway" ? "default" : "outline"}
                    onClick={() => handleSelect("gateway")}
                    disabled={isPending}
                >
                    Vercel AI Gateway Fallback
                </Button>
            </div>
            {initialProvider === "gateway" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Note: Ensure your Gateway configurations (like VERCEL_AI_GATEWAY_URL) are set in .env.
                </p>
            )}
        </div>
    );
}

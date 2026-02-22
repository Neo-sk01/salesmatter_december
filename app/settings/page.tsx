import { ProviderSelector } from "./provider-selector";
import { getAiProvider } from "@/lib/actions/settings";

export default async function SettingsPage() {
    const aiProvider = await getAiProvider();

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
                <ProviderSelector initialProvider={aiProvider} />
            </div>
        </div>
    )
}

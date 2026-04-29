import { ClearDatabaseButton } from "@/components/settings/clear-database-button";
import { DashboardShell } from "@/components/dashboard-shell";
import { AlertCircle } from "lucide-react";

export default async function SettingsPage() {
    return (
        <DashboardShell>
            <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                </div>

                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Danger Zone</h2>
                    </div>
                    <p className="text-muted-foreground text-sm mb-6">
                        The actions below are irreversible. Please proceed with caution.
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-destructive/10 pt-6">
                        <div>
                            <h3 className="font-medium text-foreground">Clear Database</h3>
                            <p className="text-sm text-muted-foreground">
                                Removes all ingested files, leads, and email records. This does not affect your configuration settings.
                            </p>
                        </div>
                        <ClearDatabaseButton />
                    </div>
                </div>
            </div>
        </DashboardShell>
    )
}

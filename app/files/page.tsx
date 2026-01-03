
import { DashboardShell } from "@/components/dashboard-shell"
import { FilesTable } from "@/components/files-table"

export default function FilesPage() {
    return (
        <DashboardShell>
            <div className="flex flex-col h-full">
                <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">File System</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage and view your imported lead lists and documents.
                        </p>
                    </div>
                </header>

                <div className="p-6">
                    <FilesTable />
                </div>
            </div>
        </DashboardShell>
    )
}

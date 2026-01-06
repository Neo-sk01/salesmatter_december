"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { FileText, Loader2, FolderOpen, ChevronRight, Users, Sparkles } from "lucide-react"
import { toast } from "sonner"
import type { ImportedLead } from "@/types"
import { useOutreachContext } from "@/contexts/outreach-context"
import { useRouter } from "next/navigation"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LeadSelectionTable } from "./lead-selection-table"

interface ProcessedFile {
    id: string
    filename: string
    description: string
    row_count: number
    created_at: string
}

interface FileSelectorModalProps {
    children: React.ReactNode
    onLeadsStaged?: () => void
}

export function FileSelectorModal({ children, onLeadsStaged }: FileSelectorModalProps) {
    const router = useRouter()
    const { importLeads } = useOutreachContext()
    const [open, setOpen] = useState(false)
    const [files, setFiles] = useState<ProcessedFile[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<ProcessedFile | null>(null)
    const [leads, setLeads] = useState<ImportedLead[]>([])
    const [loadingLeads, setLoadingLeads] = useState(false)

    // Fetch files when modal opens
    useEffect(() => {
        if (open) {
            setLoading(true)
            fetch("/api/files")
                .then((res) => res.json())
                .then((data) => {
                    if (data.files) {
                        setFiles(data.files)
                    }
                })
                .catch((err) => {
                    console.error("Failed to load files:", err)
                    toast.error("Failed to load files")
                })
                .finally(() => setLoading(false))
        } else {
            // Reset state when modal closes
            setSelectedFile(null)
            setLeads([])
        }
    }, [open])

    // Fetch leads when a file is selected
    const handleFileSelect = useCallback(async (file: ProcessedFile) => {
        setSelectedFile(file)
        setLoadingLeads(true)

        try {
            const res = await fetch(`/api/files/${file.id}/leads`)
            const data = await res.json()

            if (data.leads) {
                const mappedLeads: ImportedLead[] = data.leads.map((l: any) => ({
                    id: l.id,
                    firstName: l.first_name || l.firstName || "",
                    lastName: l.last_name || l.lastName || "",
                    email: l.email || "",
                    company: l.company || "",
                    role: l.role || "",
                    linkedinUrl: l.linkedin_url || l.linkedinUrl || "",
                    selected: true,
                }))
                setLeads(mappedLeads)
            }
        } catch (error) {
            console.error("Failed to load leads:", error)
            toast.error("Failed to load leads from file")
        } finally {
            setLoadingLeads(false)
        }
    }, [])

    const handleToggleLead = useCallback((leadId: string) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, selected: !l.selected } : l))
    }, [])

    const handleSelectAll = useCallback((selected: boolean) => {
        setLeads(prev => prev.map(l => ({ ...l, selected })))
    }, [])

    const handleStageForDrafting = useCallback(() => {
        const selectedLeads = leads.filter(l => l.selected)
        if (selectedLeads.length === 0) {
            toast.error("No leads selected")
            return
        }

        importLeads(selectedLeads)
        toast.success(`${selectedLeads.length} leads staged for drafting`)
        setOpen(false)
        onLeadsStaged?.()
        router.push("/") // Navigate to leads page to generate drafts
    }, [leads, importLeads, onLeadsStaged, router])

    const handleBack = useCallback(() => {
        setSelectedFile(null)
        setLeads([])
    }, [])

    const selectedCount = leads.filter(l => l.selected).length

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {selectedFile ? (
                            <>
                                <Button variant="ghost" size="icon" className="h-6 w-6 mr-1" onClick={handleBack}>
                                    <ChevronRight className="h-4 w-4 rotate-180" />
                                </Button>
                                <Users className="h-5 w-5 text-primary" />
                                {selectedFile.filename}
                            </>
                        ) : (
                            <>
                                <FolderOpen className="h-5 w-5 text-primary" />
                                Select from Saved Files
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {selectedFile
                            ? `Select leads from this file to stage for drafting`
                            : "Choose a previously uploaded file to select leads from"
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : selectedFile ? (
                        // Show leads from selected file
                        loadingLeads ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : leads.length > 0 ? (
                            <LeadSelectionTable
                                leads={leads}
                                onToggle={handleToggleLead}
                                onSelectAll={handleSelectAll}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Users className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No leads found in this file</p>
                            </div>
                        )
                    ) : (
                        // Show file list
                        <ScrollArea className="h-[350px]">
                            {files.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                                    <FolderOpen className="h-10 w-10 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">No saved files yet</p>
                                    <p className="text-xs text-muted-foreground mt-1">Import a CSV or Excel file first</p>
                                </div>
                            ) : (
                                <div className="space-y-1 pr-4">
                                    {files.map((file) => (
                                        <button
                                            key={file.id}
                                            onClick={() => handleFileSelect(file)}
                                            className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-primary/10 p-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-foreground">{file.filename}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {file.row_count} leads · {format(new Date(file.created_at), "MMM d, yyyy")}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </div>

                {selectedFile && leads.length > 0 && (
                    <DialogFooter className="gap-4 sm:gap-4 mt-4">
                        <Button variant="outline" onClick={handleBack}>
                            Back to Files
                        </Button>
                        <Button
                            onClick={handleStageForDrafting}
                            disabled={selectedCount === 0}
                            className="gap-2"
                        >
                            <Sparkles className="h-4 w-4" />
                            Stage {selectedCount} Lead{selectedCount !== 1 ? "s" : ""} for Drafting
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

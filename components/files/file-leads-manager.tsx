"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Edit, Trash2, Send, Save } from "lucide-react"
import { toast } from "sonner"
import type { ImportedLead } from "@/types"
import { useOutreachContext } from "@/contexts/outreach-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { LeadSelectionTable } from "@/components/outreach/lead-selection-table"

interface FileLeadsManagerProps {
    fileId: string
    initialLeads: ImportedLead[]
    filename: string
}

export function FileLeadsManager({ fileId, initialLeads, filename }: FileLeadsManagerProps) {
    const router = useRouter()
    const { importLeads } = useOutreachContext()
    const [leads, setLeads] = useState<ImportedLead[]>(initialLeads.map(l => ({ ...l, selected: false })))
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingLead, setEditingLead] = useState<ImportedLead | null>(null)

    // Form state
    const [formData, setFormData] = useState<Partial<ImportedLead>>({})

    const handleToggleLead = useCallback((leadId: string) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, selected: !l.selected } : l))
    }, [])

    const handleSelectAll = useCallback((selected: boolean) => {
        setLeads(prev => prev.map(l => ({ ...l, selected })))
    }, [])

    const openAddDialog = () => {
        setEditingLead(null)
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            company: "",
            role: "",
            linkedinUrl: ""
        })
        setIsDialogOpen(true)
    }

    const openEditDialog = (lead: ImportedLead) => {
        setEditingLead(lead)
        setFormData(lead)
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        try {
            const action = editingLead ? "update" : "add"
            const leadToSave = {
                ...formData,
                id: editingLead ? editingLead.id : undefined
            }

            const res = await fetch(`/api/files/${fileId}/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, lead: leadToSave })
            })

            if (!res.ok) throw new Error("Failed to save lead")

            const result = await res.json()
            setLeads(result.leads.map((l: ImportedLead) => ({ ...l, selected: false }))) // Reset selection on update
            toast.success(editingLead ? "Lead updated" : "Lead added")
            setIsDialogOpen(false)

        } catch (error) {
            console.error(error)
            toast.error("Failed to save lead")
        }
    }

    const handleDelete = async (leadId: string) => {
        try {
            const res = await fetch(`/api/files/${fileId}/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete", lead: { id: leadId } })
            })

            if (!res.ok) throw new Error("Failed to delete lead")

            const result = await res.json()
            setLeads(result.leads.map((l: ImportedLead) => ({ ...l, selected: false })))
            toast.success("Lead deleted")

        } catch (error) {
            console.error(error)
            toast.error("Failed to delete lead")
        }
    }

    const handleStage = () => {
        const selected = leads.filter(l => l.selected)
        if (selected.length === 0) {
            toast.error("No leads selected")
            return
        }

        // Import into context
        importLeads(selected)
        toast.success(`${selected.length} leads staged for drafting`)
        router.push("/") // Redirect to main Leads/Drafts view
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-semibold">{filename}</h2>
                        <p className="text-sm text-muted-foreground">{leads.length} leads</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={openAddDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Lead
                    </Button>
                    <Button onClick={handleStage} disabled={leads.filter(l => l.selected).length === 0}>
                        <Send className="h-4 w-4 mr-2" />
                        Stage for Drafting
                    </Button>
                </div>
            </div>

            <div className="border rounded-md">
                {/* We reuse LeadSelectionTable but might need small tweaks or wrapper to inject actions */}
                {/* Since LeadSelectionTable doesn't support actions column, we might need to modify it OR create a custom table here. 
             For speed, I will use a custom table implementations similar to LeadSelectionTable but with actions. 
          */}
                <CustomLeadTable
                    leads={leads}
                    onToggle={handleToggleLead}
                    onSelectAll={handleSelectAll}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                />
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingLead ? "Edit Lead" : "Add Lead"}</DialogTitle>
                        <DialogDescription>
                            {editingLead ? "Update lead details." : "Enter details for the new lead."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fname" className="text-right">First Name</Label>
                            <Input id="fname" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lname" className="text-right">Last Name</Label>
                            <Input id="lname" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">Email</Label>
                            <Input id="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="company" className="text-right">Company</Label>
                            <Input id="company" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">Role</Label>
                            <Input id="role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="linkedin" className="text-right">LinkedIn URL</Label>
                            <Input id="linkedin" value={formData.linkedinUrl} onChange={e => setFormData({ ...formData, linkedinUrl: e.target.value })} className="col-span-3" placeholder="https://linkedin.com/in/..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSave}>
                            {editingLead ? "Save Changes" : "Add Lead"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Internal helper component to include Actions
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"

interface CustomTableProps {
    leads: ImportedLead[]
    onToggle: (id: string) => void
    onSelectAll: (selected: boolean) => void
    onEdit: (lead: ImportedLead) => void
    onDelete: (id: string) => void
}

function CustomLeadTable({ leads, onToggle, onSelectAll, onEdit, onDelete }: CustomTableProps) {
    const selectedCount = leads.filter(l => l.selected).length
    const allSelected = leads.length > 0 && selectedCount === leads.length

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox checked={allSelected} onCheckedChange={(c) => onSelectAll(!!c)} />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>LinkedIn</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {leads.map(lead => (
                    <TableRow key={lead.id} className={lead.selected ? "bg-muted/50" : ""}>
                        <TableCell>
                            <Checkbox checked={lead.selected} onCheckedChange={() => onToggle(lead.id)} />
                        </TableCell>
                        <TableCell>{lead.firstName} {lead.lastName}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.company}</TableCell>
                        <TableCell>{lead.role}</TableCell>
                        <TableCell>
                            {lead.linkedinUrl ? (
                                <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[120px] block">
                                    Profile
                                </a>
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(lead)}>
                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete this lead from the file.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(lead.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Send } from "lucide-react"
import type { EmailDraft } from "@/types"

interface EditDraftDialogProps {
    draft: EmailDraft | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (id: string, updates: Partial<EmailDraft>) => void
    onSend: (id: string) => void
}

export function EditDraftDialog({ draft, open, onOpenChange, onSave, onSend }: EditDraftDialogProps) {
    const [subject, setSubject] = useState("")
    const [body, setBody] = useState("")
    const [isSending, setIsSending] = useState(false)

    useEffect(() => {
        if (draft) {
            setSubject(draft.subject)
            setBody(draft.body)
        }
    }, [draft])

    const handleSave = () => {
        if (!draft) return
        onSave(draft.id, { subject, body })
        onOpenChange(false)
    }

    const handleSend = async () => {
        if (!draft) return

        // First save any changes
        onSave(draft.id, { subject, body })

        // Then send
        setIsSending(true)
        await onSend(draft.id)
        setIsSending(false)
        onOpenChange(false)
    }

    if (!draft) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Email Draft</DialogTitle>
                    <DialogDescription>
                        Make changes to the email before sending it to {draft.lead.firstName} {draft.lead.lastName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 gap-4 flex flex-col">
                    <div className="grid gap-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Email subject..."
                        />
                    </div>

                    <div className="grid gap-2 flex-1 min-h-[300px]">
                        <Label htmlFor="body">Message Body</Label>
                        <Textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="flex-1 min-h-[300px] resize-none font-mono text-sm leading-relaxed"
                            placeholder="Email content..."
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="secondary" onClick={handleSave}>
                        Save Changes
                    </Button>
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

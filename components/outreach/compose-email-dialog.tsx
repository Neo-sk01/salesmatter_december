import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Send } from "lucide-react"

interface ComposeEmailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSend: (to: string, subject: string, body: string) => Promise<void>
}

export function ComposeEmailDialog({ open, onOpenChange, onSend }: ComposeEmailDialogProps) {
    const [to, setTo] = useState("")
    const [subject, setSubject] = useState("")
    const [body, setBody] = useState("")
    const [isSending, setIsSending] = useState(false)

    const handleSend = async () => {
        if (!to || !subject || !body) return

        setIsSending(true)
        try {
            await onSend(to, subject, body)
            // Only reset form and close on success
            setTo("")
            setSubject("")
            setBody("")
            onOpenChange(false)
        } catch {
            // Error is handled by parent with toast, keep dialog open
        } finally {
            setIsSending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Compose Email</DialogTitle>
                    <DialogDescription>
                        Draft and send a new email manually.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 gap-4 flex flex-col">
                    <div className="grid gap-2">
                        <Label htmlFor="to">To</Label>
                        <Input
                            id="to"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="recipient@example.com"
                            type="email"
                        />
                    </div>

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
                    <Button onClick={handleSend} disabled={isSending || !to || !subject || !body}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send Email
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

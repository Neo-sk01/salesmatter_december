"use client"

import { useEffect, useRef } from "react"
import { format } from "date-fns"
import { Copy, RotateCcwSquare, X, Clock } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DraftVersion } from "@/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: DraftVersion | null
  versionLabel: string
  onRestore: () => void
}

export function PreviousDraftDialog({ open, onOpenChange, version, versionLabel, onRestore }: Props) {
  const restoreRef = useRef<HTMLButtonElement | null>(null)

  // Move focus into the drawer so screen readers and keyboard users land on a
  // sensible action when it opens.
  useEffect(() => {
    if (open && restoreRef.current) {
      const t = setTimeout(() => restoreRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleCopy = async () => {
    if (!version) return
    try {
      await navigator.clipboard.writeText(`Subject: ${version.subject}\n\n${version.body}`)
      toast.success("Previous draft copied to clipboard.")
    } catch {
      toast.error("Could not copy to clipboard.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-[100dvh] w-full max-w-full sm:max-w-xl rounded-none border-l border-border p-0 sm:h-[100dvh] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
            <div className="flex flex-col gap-1.5 min-w-0">
              <Badge variant="secondary" className="w-fit bg-primary/10 text-primary font-medium px-2 py-0.5 text-[10px] uppercase tracking-wider">
                Previous Draft
              </Badge>
              <DialogTitle className="text-base font-semibold text-foreground truncate">
                {versionLabel}
              </DialogTitle>
              {version && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Generated {format(new Date(version.generatedAt), "MMM d, h:mm a")}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close previous draft preview"
              className="h-8 w-8 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <ScrollArea className="flex-1 px-5 py-4">
            {version ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Subject</p>
                  <p className="text-sm font-medium text-foreground">{version.subject}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Body</p>
                  <p className="text-sm whitespace-pre-wrap text-foreground/85 leading-relaxed">{version.body}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No version selected.</p>
            )}
          </ScrollArea>

          <footer className="flex flex-col-reverse gap-2 border-t border-border bg-card/60 px-5 py-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              Close
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!version}
              className="gap-2"
              aria-label="Copy previous draft"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
            <Button
              ref={restoreRef}
              size="sm"
              onClick={() => {
                onRestore()
                onOpenChange(false)
              }}
              disabled={!version}
              className="gap-2"
              aria-label="Restore as current draft"
            >
              <RotateCcwSquare className="h-3.5 w-3.5" />
              Restore as Current
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

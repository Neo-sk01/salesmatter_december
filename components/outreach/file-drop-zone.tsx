"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  onFileAccepted: (file: File) => void
  acceptedTypes?: string[]
  maxSizeMB?: number
}

export function FileDropZone({ onFileAccepted, acceptedTypes = [".csv", ".xlsx", ".xls"], maxSizeMB = 10 }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback(
    (file: File): boolean => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`
      if (!acceptedTypes.includes(extension)) {
        setError(`Invalid file type. Accepted: ${acceptedTypes.join(", ")}`)
        return false
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum size: ${maxSizeMB}MB`)
        return false
      }
      return true
    },
    [acceptedTypes, maxSizeMB],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      setError(null)

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile && validateFile(droppedFile)) {
        setFile(droppedFile)
        onFileAccepted(droppedFile)
      }
    },
    [onFileAccepted, validateFile],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null)
      const selectedFile = e.target.files?.[0]
      if (selectedFile && validateFile(selectedFile)) {
        setFile(selectedFile)
        onFileAccepted(selectedFile)
      }
    },
    [onFileAccepted, validateFile],
  )

  const clearFile = useCallback(() => {
    setFile(null)
    setError(null)
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
          file && "border-emerald-500 bg-emerald-50/50",
        )}
      >
        {!file ? (
          <>
            <div
              className={cn(
                "rounded-2xl p-5 transition-all mb-4",
                isDragging ? "bg-primary/20 scale-110" : "bg-primary/10",
              )}
            >
              <Upload className={cn("h-10 w-10 transition-colors", isDragging ? "text-primary" : "text-primary/70")} />
            </div>
            <p className="text-base font-medium text-foreground">
              {isDragging ? "Drop your file here" : "Drop your lead list here"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">CSV, XLSX, or XLS up to {maxSizeMB}MB</p>
            <p className="mt-4 text-xs text-muted-foreground/70">Include columns: Name, Email, Company, Role</p>
            <label>
              <Button variant="outline" className="mt-5 bg-transparent gap-2" asChild>
                <span>
                  <Sparkles className="h-4 w-4" />
                  Browse Files
                </span>
              </Button>
              <input type="file" accept={acceptedTypes.join(",")} onChange={handleFileSelect} className="sr-only" />
            </label>
          </>
        ) : (
          <div className="flex w-full items-center gap-4">
            <div className="rounded-xl bg-emerald-100 p-4">
              <FileSpreadsheet className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(file.size)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <Check className="h-4 w-4" />
                Uploaded
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={clearFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

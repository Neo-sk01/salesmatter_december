"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { FileText, Download } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ProcessedFile {
    id: string
    filename: string
    description: string
    row_count: number
    file_size_bytes: number
    status: string
    created_at: string
}

export function FilesTable() {
    const [files, setFiles] = useState<ProcessedFile[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/files")
            .then((res) => res.json())
            .then((data) => {
                if (data.files) {
                    setFiles(data.files)
                }
            })
            .catch((err) => console.error("Failed to load files:", err))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return <div className="text-sm text-muted-foreground p-4">Loading files...</div>
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Imported</TableHead>
                        <TableHead className="text-right">Rows</TableHead>
                        <TableHead className="text-right">Size (KB)</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {files.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No files found. Import leads to get started.
                            </TableCell>
                        </TableRow>
                    ) : (
                        files.map((file) => (
                            <TableRow key={file.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {file.filename}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{file.description}</TableCell>
                                <TableCell>{format(new Date(file.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                                <TableCell className="text-right">{file.row_count}</TableCell>
                                <TableCell className="text-right">
                                    {Math.round(file.file_size_bytes / 1024)} KB
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="secondary" className="capitalize">
                                        {file.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { ImportedLead } from "@/types"

type Props = {
  leads: ImportedLead[]
  onToggle: (leadId: string) => void
  onSelectAll: (selected: boolean) => void
}

export function LeadSelectionTable({ leads, onToggle, onSelectAll }: Props) {
  const selectedCount = leads.filter((l) => l.selected).length
  const allSelected = leads.length > 0 && selectedCount === leads.length
  const someSelected = selectedCount > 0 && selectedCount < leads.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedCount} of {leads.length} leads selected
        </p>
        <Badge variant="secondary" className="font-normal">
          {leads.length} imported
        </Badge>
      </div>

      <div className="rounded-lg border border-border bg-card max-h-[400px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) (el as HTMLButtonElement).dataset.state = someSelected ? "indeterminate" : undefined
                  }}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} className={lead.selected ? "bg-primary/5" : undefined}>
                <TableCell>
                  <Checkbox checked={lead.selected} onCheckedChange={() => onToggle(lead.id)} />
                </TableCell>
                <TableCell className="font-medium">
                  {lead.firstName} {lead.lastName}
                </TableCell>
                <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                <TableCell>{lead.company}</TableCell>
                <TableCell>{lead.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

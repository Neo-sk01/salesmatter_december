"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

type Step = {
  id: number
  name: string
}

const steps: Step[] = [
  { id: 1, name: "Import" },
  { id: 2, name: "Draft" },
  { id: 3, name: "Send" },
]

type Props = {
  currentStep: number
}

export function MinimalStepper({ currentStep }: Props) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id
        const isActive = currentStep === step.id

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive && "bg-primary text-primary-foreground",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.id}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive || isCompleted ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn("h-px w-8 transition-colors", currentStep > step.id ? "bg-primary" : "bg-border")} />
            )}
          </div>
        )
      })}
    </div>
  )
}

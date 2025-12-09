"use client"

import { useState } from "react"
import { X, Upload, FileEdit, Send, BarChart3, ChevronRight, ChevronLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const steps = [
  {
    icon: Upload,
    title: "Import Your Leads",
    description: "Upload a CSV or Excel file with your prospect list. We'll map the columns automatically.",
    tip: "Include first name, last name, email, company, and role for best results.",
  },
  {
    icon: FileEdit,
    title: "Review & Edit Drafts",
    description: "AI generates personalized emails for each lead. Review and customize before sending.",
    tip: "Click 'View Prompt' to customize the AI's writing style.",
  },
  {
    icon: Send,
    title: "Send Emails",
    description: "Send individually or in bulk. Track delivery status in real-time.",
    tip: "Start with a small batch to test your messaging.",
  },
  {
    icon: BarChart3,
    title: "Track Performance",
    description: "Monitor open rates, clicks, and replies. Optimize your outreach based on data.",
    tip: "Aim for 20%+ reply rates with personalized messaging.",
  },
]

interface OnboardingGuideProps {
  onDismiss: () => void
}

export function OnboardingGuide({ onDismiss }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Quick Start Guide</h3>
              <p className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              {(() => {
                const Icon = steps[currentStep].icon
                return <Icon className="h-4 w-4" />
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground">{steps[currentStep].title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{steps[currentStep].description}</p>
              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/50 p-2">
                <span className="text-[10px] font-medium text-primary uppercase tracking-wide">Tip:</span>
                <span className="text-xs text-muted-foreground">{steps[currentStep].tip}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep ? "w-4 bg-primary" : "w-1.5 bg-primary/20 hover:bg-primary/40"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-3 w-3 mr-0.5" />
                Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button size="sm" className="h-7 px-2 text-xs" onClick={() => setCurrentStep((s) => s + 1)}>
                  Next
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              ) : (
                <Button size="sm" className="h-7 px-2 text-xs" onClick={onDismiss}>
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

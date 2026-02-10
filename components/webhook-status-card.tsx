"use client"

import { useState, useEffect, useCallback } from "react"
import {
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Loader2,
    RefreshCw,
    WifiOff,
    Clock,
    ShieldAlert,
    Settings,
    X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { registerWebhookAction } from "@/app/actions/register-webhook"
import { reprocessWebhooksAction } from "@/app/actions/reprocess-webhooks"
import { toast } from "sonner"

interface WebhookStatus {
    registered: boolean
    enabled: boolean
    url: string | null
    lastEventAt: string | null
    eventTypes: string[]
    error?: string
    errorCode?: string
}

// Map error codes to user-friendly messages
function getErrorMessage(errorCode?: string, rawError?: string): { message: string; icon: React.ComponentType<{ className?: string }> } {
    if (!errorCode && !rawError) {
        return { message: "Unknown error", icon: AlertCircle }
    }

    switch (errorCode) {
        case "MISSING_CREDENTIALS":
            return { message: "Credentials not configured", icon: ShieldAlert }
        case "AUTH_FAILED":
            return { message: "Authentication failed", icon: ShieldAlert }
        case "CONNECTION_ERROR":
            return { message: "Unable to connect", icon: WifiOff }
        case "TIMEOUT":
            return { message: "Request timed out", icon: Clock }
        default:
            if (rawError?.includes("timeout")) {
                return { message: "Connection timed out", icon: Clock }
            }
            return { message: rawError || "An error occurred", icon: AlertCircle }
    }
}

function formatEventTime(timestamp: string | null): string {
    if (!timestamp) return "No events yet"
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}

interface WebhookStatusPillProps {
    className?: string
}

export function WebhookStatusPill({ className }: WebhookStatusPillProps) {
    const [status, setStatus] = useState<WebhookStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<{ message: string; code?: string } | null>(null)

    const fetchStatus = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/webhook-status")
            const data = await res.json()

            if (!res.ok || data.error) {
                setError({ message: data.error || "Failed to fetch", code: data.errorCode })
                setStatus(data)
            } else {
                setStatus(data)
            }
        } catch (err: any) {
            setError({ message: err?.message || "Failed to connect" })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    if (isLoading) {
        return (
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium", className)}>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Checking...</span>
            </div>
        )
    }

    if (error || !status?.registered) {
        return (
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium", className)}>
                <AlertTriangle className="h-3 w-3" />
                <span>{error ? "Error" : "Not Connected"}</span>
            </div>
        )
    }

    if (!status.enabled) {
        return (
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium", className)}>
                <AlertCircle className="h-3 w-3" />
                <span>Disabled</span>
            </div>
        )
    }

    return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium", className)}>
            <CheckCircle2 className="h-3 w-3" />
            <span>Active</span>
        </div>
    )
}

interface WebhookStatusBannerProps {
    className?: string
}

export function WebhookStatusBanner({ className }: WebhookStatusBannerProps) {
    const [status, setStatus] = useState<WebhookStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<{ message: string; code?: string } | null>(null)
    const [showManagePanel, setShowManagePanel] = useState(false)
    const [isRegistering, setIsRegistering] = useState(false)
    const [isRetrying, setIsRetrying] = useState(false)

    const fetchStatus = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/webhook-status")
            const data = await res.json()

            if (!res.ok || data.error) {
                setError({ message: data.error || "Failed to fetch", code: data.errorCode })
                setStatus(data)
            } else {
                setStatus(data)
                setError(null)
            }
        } catch (err: any) {
            setError({ message: err?.message || "Failed to connect" })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    const handleRegister = async () => {
        setIsRegistering(true)
        try {
            const result = await registerWebhookAction()
            if (result.success) {
                toast.success("Webhook registered successfully")
                await fetchStatus()
            } else {
                const { message } = getErrorMessage(result.errorCode, result.error)
                toast.error("Registration failed", { description: message })
            }
        } catch {
            toast.error("Registration failed")
        } finally {
            setIsRegistering(false)
        }
    }

    const handleRetry = async () => {
        setIsRetrying(true)
        try {
            const result = await reprocessWebhooksAction()
            if (result.success) {
                toast.success("Reprocessing started", { description: "Failed events will be retried" })
            } else {
                const { message } = getErrorMessage(result.errorCode, result.error)
                toast.error("Reprocessing failed", { description: message })
            }
        } catch {
            toast.error("Reprocessing failed")
        } finally {
            setIsRetrying(false)
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-between px-4 py-2 rounded-lg bg-muted/50 border border-border", className)}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking webhook status...</span>
                </div>
            </div>
        )
    }

    // Error state
    if (error && !status?.registered) {
        const { message, icon: ErrorIcon } = getErrorMessage(error.code, error.message)
        return (
            <div className={cn("flex items-center justify-between px-4 py-2 rounded-lg bg-red-50 border border-red-200", className)}>
                <div className="flex items-center gap-2 text-sm text-red-700">
                    <ErrorIcon className="h-4 w-4" />
                    <span>Webhook Error: {message}</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchStatus}
                    className="text-red-700 hover:text-red-800 hover:bg-red-100"
                >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                </Button>
            </div>
        )
    }

    // Not registered state
    if (!status?.registered) {
        return (
            <div className={cn("flex items-center justify-between px-4 py-2 rounded-lg bg-amber-50 border border-amber-200", className)}>
                <div className="flex items-center gap-2 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Webhook not registered • Email tracking is disabled</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegister}
                    disabled={isRegistering}
                    className="text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                >
                    {isRegistering ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : null}
                    Register Now
                </Button>
            </div>
        )
    }

    // Connected state
    return (
        <>
            <div className={cn("flex items-center justify-between px-4 py-2 rounded-lg bg-green-50/50 border border-green-200/50", className)}>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">Webhook Connected</span>
                    </div>
                    <span className="text-muted-foreground/60">•</span>
                    <span>Last event: {formatEventTime(status.lastEventAt)}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{status.eventTypes.length} event types tracked</span>
                </div>
                <button
                    onClick={() => setShowManagePanel(!showManagePanel)}
                    className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
                >
                    <Settings className="h-3.5 w-3.5" />
                    Manage
                </button>
            </div>

            {/* Expandable Manage Panel */}
            {showManagePanel && (
                <div className={cn("mt-2 p-4 rounded-lg bg-card border border-border", className)}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium">Webhook Management</h3>
                        <button
                            onClick={() => setShowManagePanel(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Event Types */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Tracking Events:</p>
                            <div className="flex flex-wrap gap-1">
                                {status.eventTypes.map((type) => (
                                    <span
                                        key={type}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary"
                                    >
                                        {type}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Webhook URL */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Webhook URL:</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                                {status.url}
                            </code>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-border">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRetry}
                                disabled={isRetrying}
                            >
                                {isRetrying && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                <RefreshCw className={cn("h-4 w-4 mr-1", isRetrying && "hidden")} />
                                Retry Failed Events
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchStatus}
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Refresh Status
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

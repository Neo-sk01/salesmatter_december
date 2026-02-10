"use client"

import { AlertCircle, RefreshCw, X, WifiOff, Clock, ServerCrash, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorBannerProps {
    message: string
    code?: string
    retryable?: boolean
    onRetry?: () => void
    onDismiss?: () => void
    className?: string
    variant?: "error" | "warning" | "info"
}

const getErrorIcon = (code?: string) => {
    switch (code) {
        case "NETWORK_ERROR":
            return WifiOff
        case "TIMEOUT":
            return Clock
        case "SERVER_ERROR":
            return ServerCrash
        case "AUTH_ERROR":
            return ShieldAlert
        default:
            return AlertCircle
    }
}

const getVariantStyles = (variant: "error" | "warning" | "info") => {
    switch (variant) {
        case "error":
            return "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-900 dark:text-red-200"
        case "warning":
            return "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-200"
        case "info":
            return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-200"
    }
}

export function ErrorBanner({
    message,
    code,
    retryable = true,
    onRetry,
    onDismiss,
    className,
    variant = "error"
}: ErrorBannerProps) {
    const Icon = getErrorIcon(code)

    return (
        <div
            className={cn(
                "flex items-center justify-between gap-4 px-4 py-3 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-300",
                getVariantStyles(variant),
                className
            )}
            role="alert"
        >
            <div className="flex items-center gap-3 min-w-0">
                <Icon className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium truncate">{message}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {retryable && onRetry && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRetry}
                        className="h-8 px-3 hover:bg-white/50 dark:hover:bg-black/20"
                    >
                        <RefreshCw className="h-4 w-4 mr-1.5" />
                        Retry
                    </Button>
                )}
                {onDismiss && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDismiss}
                        className="h-8 w-8 hover:bg-white/50 dark:hover:bg-black/20"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                )}
            </div>
        </div>
    )
}

// Inline loading skeleton for when data is loading
export function LoadingSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse", className)}>
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted rounded w-1/2" />
        </div>
    )
}

// Empty state for when there's no data
interface EmptyStateProps {
    title: string
    description?: string
    icon?: React.ReactNode
    action?: React.ReactNode
    className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
            {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && (
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}

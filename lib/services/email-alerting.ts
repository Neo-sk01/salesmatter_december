/**
 * Email Alerting Service
 * Monitors email metrics and dispatches alerts for anomalies
 */

import { getEventCountsByType, recordIngestionFailure } from '@/lib/db/email-events-db';
import type { AlertRule, AlertEvent } from '@/types/email-analytics';

// Default Alert Rules
const DEFAULT_RULES: AlertRule[] = [
    {
        name: 'High Bounce Rate',
        metric: 'bounce_rate',
        threshold: 0.05, // 5%
        windowMinutes: 60,
        severity: 'warning',
    },
    {
        name: 'Critical Delivery Failures',
        metric: 'delivery_failure',
        threshold: 10, // Absolute count
        windowMinutes: 15,
        severity: 'critical',
    },
    {
        name: 'Ingestion Failures',
        metric: 'ingestion_failures',
        threshold: 5, // Absolute count
        windowMinutes: 5,
        severity: 'warning',
    },
];

/**
 * Run all alert checks and return triggered alerts
 */
export async function checkAlerts(): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];
    const now = new Date();

    try {
        // We'll fetch data for the longest window needed (60 mins) to optimize
        // In a real system, we might query per rule.
        const maxWindow = Math.max(...DEFAULT_RULES.map(r => r.windowMinutes));
        const start = new Date(now.getTime() - maxWindow * 60 * 1000);

        // Fetch all counts once
        // Note: For more complex rules (per campaign), we'd need more granular queries.
        // This is a simplified implementation for global health.
        const counts = await getEventCountsByType(start, now);

        for (const rule of DEFAULT_RULES) {
            const ruleStart = new Date(now.getTime() - rule.windowMinutes * 60 * 1000);

            // Re-fetching strictly for the rule window would be more accurate,
            // but for this MVP we'll use the counts we have if they match the window,
            // or just accept slightly wider window stats for "last hour" vs "last 15m" 
            // if we only fetched once. 
            // To be correct, let's just fetch specifically for each rule or accept the 
            // slight trade-off. Let's fetch specifically for correctness.

            const ruleCounts = await getEventCountsByType(ruleStart, now);

            const sent = ruleCounts.get('sent') || 0;
            const bounces = ruleCounts.get('bounce') || 0;
            const failures = ruleCounts.get('failed') || 0;
            const ingestionFailures = ruleCounts.get('ingestion_failure') || 0;

            let value = 0;
            let triggered = false;

            switch (rule.metric) {
                case 'bounce_rate':
                    // Avoid division by zero
                    if (sent > 10) {
                        value = bounces / sent;
                        triggered = value > rule.threshold;
                    }
                    break;
                case 'delivery_failure':
                    value = failures;
                    triggered = value > rule.threshold;
                    break;
                case 'ingestion_failures':
                    value = ingestionFailures;
                    triggered = value > rule.threshold;
                    break;
            }

            if (triggered) {
                alerts.push({
                    rule: rule.name,
                    severity: rule.severity,
                    metricValue: value,
                    threshold: rule.threshold,
                    timeWindow: { start: ruleStart, end: now },
                    triggeredAt: now,
                });
            }
        }

    } catch (err) {
        console.error('[email-alerting] Failed to check alerts:', err);
        // Self-monitoring: record this failure too
        await recordIngestionFailure('Alert check failed', { error: String(err) });
    }

    return alerts;
}

/**
 * Dispatch alerts to notification channels
 * Currently logs to console/stdout (which can be piped to logging aggregators)
 */
export async function dispatchAlerts(alerts: AlertEvent[]): Promise<void> {
    if (alerts.length === 0) return;

    console.log(`[ALERTING] ${alerts.length} alerts triggered at ${new Date().toISOString()}`);

    for (const alert of alerts) {
        // Structured logging for easy parsing
        console.log(JSON.stringify({
            level: 'alert',
            severity: alert.severity,
            rule: alert.rule,
            value: alert.metricValue,
            threshold: alert.threshold,
            window_start: alert.timeWindow.start.toISOString(),
            window_end: alert.timeWindow.end.toISOString(),
            message: `ALERT: ${alert.rule} triggered. Value: ${alert.metricValue.toFixed(4)} (Threshold: ${alert.threshold})`
        }));
    }
}

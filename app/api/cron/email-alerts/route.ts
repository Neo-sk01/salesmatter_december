/**
 * Cron Endpoint for Email Alerts
 * 
 * This endpoint should be called periodically (e.g., every 5-15 minutes)
 * by an external scheduler (Vercel Cron, GitHub Actions, etc.).
 * 
 * Usage: GET /api/cron/email-alerts
 */

import { NextResponse } from 'next/server';
import { checkAlerts, dispatchAlerts } from '@/lib/services/email-alerting';

// Optional: Require specific header for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
    // 1. Authorization Check (if configured)
    if (CRON_SECRET) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        // 2. Run Alert Checks
        const alerts = await checkAlerts();

        // 3. Dispatch Alerts (if any)
        await dispatchAlerts(alerts);

        return NextResponse.json({
            success: true,
            triggered: alerts.length,
            alerts: alerts.map(a => ({
                rule: a.rule,
                severity: a.severity,
                value: a.metricValue
            }))
        });
    } catch (err) {
        console.error('[cron/email-alerts] Job failed:', err);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

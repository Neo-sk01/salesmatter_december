'use server'

import { getEventCountsByType, getDailyEventCounts, getEventsByTimeRange } from "@/lib/db/email-events-db";
import { EmailMetrics, DailyMetric, RecentSentEmail } from "@/types";

export async function getAnalyticsData(): Promise<{ metrics: EmailMetrics; dailyMetrics: DailyMetric[]; recentSentEmails: RecentSentEmail[] }> {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days

        // 1. Fetch totals
        const countsMap = await getEventCountsByType(startDate, endDate);

        const sent = countsMap.get('sent') || 0;
        const delivered = countsMap.get('delivered') || 0;
        const opened = countsMap.get('open') || 0;
        const clicked = countsMap.get('click') || 0;
        const bounced = countsMap.get('bounce') || 0;
        // Approximation for replied if not tracked directly (resubscribe is sometimes used, but 'reply' is better if provider supports it)
        // Everlytic doesn't explicitly have 'reply' event in the list we implemented, so this might be 0.
        // If we want to track replies, we usually need incoming mail processing (IMAP/Webhook for incoming).
        const replied = countsMap.get('resubscribe') || 0;

        // calculate rates
        const openRate = delivered > 0 ? Math.round((opened / delivered) * 100 * 10) / 10 : 0;
        const clickRate = opened > 0 ? Math.round((clicked / opened) * 100 * 10) / 10 : 0; // Click rate is usually clicks / opens or clicks / delivered
        // Let's use clicks / delivered for standard "Click Rate" often used in marketing, or clicks / opens for "Click Through Open Rate" (CTOR).
        // The dashboard screenshot implies generic "Click Rate". I'll use click / delivered.
        const clickRateDelivered = delivered > 0 ? Math.round((clicked / delivered) * 100 * 10) / 10 : 0;

        const replyRate = delivered > 0 ? Math.round((replied / delivered) * 100 * 10) / 10 : 0;
        const bounceRate = sent > 0 ? Math.round((bounced / sent) * 100 * 10) / 10 : 0;

        const metrics: EmailMetrics = {
            sent,
            delivered,
            opened,
            clicked,
            replied,
            bounced,
            openRate,
            clickRate: clickRateDelivered,
            replyRate,
            bounceRate
        };

        // 2. Fetch daily metrics
        const dailyData = await getDailyEventCounts(30);

        // Transform to frontend DailyMetric type
        const dailyMetrics: DailyMetric[] = dailyData.map(d => ({
            date: d.date,
            sent: d.sent,
            opened: d.opened,
            replied: d.replied
        }));

        // 3. Fetch recent sent emails
        const recentEvents = await getEventsByTimeRange(startDate, endDate, 'sent');
        const recentSentEmails: RecentSentEmail[] = recentEvents.slice(0, 5).map(e => ({
            id: e.message_id,
            email: e.email,
            subject: (e.raw_payload as any)?.subject || "Sent Email",
            sentAt: e.occurred_at
        }));

        return { metrics, dailyMetrics, recentSentEmails };
    } catch (error) {
        console.error("Error fetching analytics data:", error);
        return {
            metrics: {
                sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0,
                openRate: 0, clickRate: 0, replyRate: 0, bounceRate: 0
            },
            dailyMetrics: [],
            recentSentEmails: []
        };
    }
}

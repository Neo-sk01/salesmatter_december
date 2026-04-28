"use server";

import {
    getEventCountsByType,
    getDailyEventCounts,
    getEventsByTimeRange,
} from "@/lib/db/instantly-events-db";
import type { EmailMetrics, DailyMetric, RecentSentEmail } from "@/types";

export async function getAnalyticsData(): Promise<{
    metrics: EmailMetrics;
    dailyMetrics: DailyMetric[];
    recentSentEmails: RecentSentEmail[];
}> {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const counts = await getEventCountsByType(startDate, endDate);

        const sent = counts.get("email_sent") ?? 0;
        const opened = counts.get("email_opened") ?? 0;
        const clicked = counts.get("link_clicked") ?? 0;
        const replied =
            (counts.get("reply_received") ?? 0) +
            (counts.get("auto_reply_received") ?? 0);
        const bounced = counts.get("email_bounced") ?? 0;
        // Instantly doesn't emit a separate "delivered" event — once sent and not bounced, treat as delivered
        const delivered = Math.max(sent - bounced, 0);

        const openRate = delivered > 0 ? Math.round((opened / delivered) * 1000) / 10 : 0;
        const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 1000) / 10 : 0;
        const replyRate = delivered > 0 ? Math.round((replied / delivered) * 1000) / 10 : 0;
        const bounceRate = sent > 0 ? Math.round((bounced / sent) * 1000) / 10 : 0;

        const metrics: EmailMetrics = {
            sent,
            delivered,
            opened,
            clicked,
            replied,
            bounced,
            openRate,
            clickRate,
            replyRate,
            bounceRate,
        };

        const dailyData = await getDailyEventCounts(30);
        const dailyMetrics: DailyMetric[] = dailyData.map((d) => ({
            date: d.date,
            sent: d.sent,
            opened: d.opened,
            replied: d.replied,
        }));

        const recentEvents = await getEventsByTimeRange(startDate, endDate, "email_sent");
        const recentSentEmails: RecentSentEmail[] = recentEvents.slice(0, 5).map((e) => ({
            id: e.lead_id ?? `${e.email}-${e.occurred_at}`,
            email: e.email,
            subject:
                ((e.raw_payload as Record<string, unknown>)?.subject as string) ??
                "Sent email",
            sentAt: e.occurred_at,
        }));

        return { metrics, dailyMetrics, recentSentEmails };
    } catch (error) {
        console.error("Error fetching Instantly analytics:", error);
        return {
            metrics: {
                sent: 0,
                delivered: 0,
                opened: 0,
                clicked: 0,
                replied: 0,
                bounced: 0,
                openRate: 0,
                clickRate: 0,
                replyRate: 0,
                bounceRate: 0,
            },
            dailyMetrics: [],
            recentSentEmails: [],
        };
    }
}

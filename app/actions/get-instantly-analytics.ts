"use server";

import {
    getCampaignMetrics,
    getDailyEventCounts,
    getEventsByTimeRange,
} from "@/lib/db/instantly-events-db";
import type { EmailMetrics, DailyMetric, RecentSentEmail } from "@/types";

const ZERO_METRICS: EmailMetrics = {
    sent: 0,
    delivered: 0,
    opened: 0,
    uniqueOpened: 0,
    clicked: 0,
    uniqueClicked: 0,
    replied: 0,
    uniqueReplied: 0,
    bounced: 0,
    unsubscribed: 0,
    newLeadsContacted: 0,
    totalOpportunities: 0,
    opportunityValue: 0,
    interested: 0,
    meetingsBooked: 0,
    meetingsCompleted: 0,
    closed: 0,
    openRate: 0,
    clickRate: 0,
    replyRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
};

const pct = (num: number, denom: number): number =>
    denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;

export async function getAnalyticsData(): Promise<{
    metrics: EmailMetrics;
    dailyMetrics: DailyMetric[];
    recentSentEmails: RecentSentEmail[];
}> {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const { totalCounts, uniqueLeadCounts, uniqueRepliers, opportunityLeads } =
            await getCampaignMetrics(startDate, endDate);

        const sent = totalCounts.get("email_sent") ?? 0;
        const opened = totalCounts.get("email_opened") ?? 0;
        const uniqueOpened = uniqueLeadCounts.get("email_opened") ?? 0;
        const clicked = totalCounts.get("link_clicked") ?? 0;
        const uniqueClicked = uniqueLeadCounts.get("link_clicked") ?? 0;
        const replied =
            (totalCounts.get("reply_received") ?? 0) +
            (totalCounts.get("auto_reply_received") ?? 0);
        const uniqueReplied = uniqueRepliers;
        const bounced = totalCounts.get("email_bounced") ?? 0;
        const unsubscribed = totalCounts.get("lead_unsubscribed") ?? 0;
        const interested = totalCounts.get("lead_interested") ?? 0;
        const meetingsBooked = totalCounts.get("lead_meeting_booked") ?? 0;
        const meetingsCompleted = totalCounts.get("lead_meeting_completed") ?? 0;
        const closed = totalCounts.get("lead_closed") ?? 0;
        const newLeadsContacted = uniqueLeadCounts.get("email_sent") ?? 0;

        // Instantly doesn't emit a separate "delivered" event — once sent and not bounced, treat as delivered
        const delivered = Math.max(sent - bounced, 0);

        const metrics: EmailMetrics = {
            sent,
            delivered,
            opened,
            uniqueOpened,
            clicked,
            uniqueClicked,
            replied,
            uniqueReplied,
            bounced,
            unsubscribed,
            newLeadsContacted,
            totalOpportunities: opportunityLeads,
            opportunityValue: 0,
            interested,
            meetingsBooked,
            meetingsCompleted,
            closed,
            openRate: pct(uniqueOpened, delivered),
            clickRate: pct(uniqueClicked, delivered),
            replyRate: pct(uniqueReplied, delivered),
            bounceRate: pct(bounced, sent),
            unsubscribeRate: pct(unsubscribed, sent),
        };

        const dailyData = await getDailyEventCounts(30);
        const dailyMetrics: DailyMetric[] = dailyData.map((d) => ({
            date: d.date,
            sent: d.sent,
            opened: d.opened,
            replied: d.replied,
        }));

        const recentEvents = await getEventsByTimeRange(startDate, endDate, "email_sent");
        const recentSentEmails: RecentSentEmail[] = recentEvents
            .filter((e): e is typeof e & { email: string } => e.email !== null && e.email !== "")
            .slice(0, 5)
            .map((e) => ({
                id: `${e.email}-${e.occurred_at}`,
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
            metrics: ZERO_METRICS,
            dailyMetrics: [],
            recentSentEmails: [],
        };
    }
}

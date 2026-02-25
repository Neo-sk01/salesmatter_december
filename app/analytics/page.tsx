"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { useOutreach } from "@/hooks/use-outreach"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Eye, MousePointer, MessageSquare, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts"
import { WebhookStatusPill, WebhookStatusBanner } from "@/components/webhook-status-card"
import { WebhookReportButton } from "@/components/webhook-report-dialog"

export default function AnalyticsPage() {
  const { metrics, dailyMetrics, drafts, recentSentEmails } = useOutreach()

  const sentDrafts = drafts.filter((d) => d.status === "sent")

  const statCards = [
    {
      title: "Emails Sent",
      value: metrics.sent,
      icon: Mail,
      change: "+12%",
      trend: "up" as const,
      description: "Total emails sent",
    },
    {
      title: "Open Rate",
      value: `${metrics.openRate}%`,
      icon: Eye,
      change: "+5.2%",
      trend: "up" as const,
      description: `${metrics.opened} of ${metrics.delivered} delivered`,
    },
    {
      title: "Click Rate",
      value: `${metrics.clickRate}%`,
      icon: MousePointer,
      change: "-2.1%",
      trend: "down" as const,
      description: `${metrics.clicked} link clicks`,
    },
    {
      title: "Reply Rate",
      value: `${metrics.replyRate}%`,
      icon: MessageSquare,
      change: "+8.3%",
      trend: "up" as const,
      description: `${metrics.replied} replies received`,
    },
    {
      title: "Bounce Rate",
      value: `${metrics.bounceRate}%`,
      icon: AlertTriangle,
      change: "-0.5%",
      trend: "up" as const,
      description: `${metrics.bounced} bounced`,
    },
  ]

  return (
    <DashboardShell>
      <div className="p-6 space-y-4">
        {/* Header with compact status pill */}
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track your email performance and optimize your outreach
            </p>
          </div>
          <div className="flex items-center gap-2">
            <WebhookReportButton />
            <WebhookStatusPill />
          </div>
        </div>

        {/* Thin Status Banner */}
        <WebhookStatusBanner />

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div
                    className={`flex items-center gap-0.5 text-xs font-medium ${stat.trend === "up" && !stat.title.includes("Bounce")
                      ? "text-green-600"
                      : stat.trend === "down" && stat.title.includes("Bounce")
                        ? "text-green-600"
                        : stat.trend === "down"
                          ? "text-red-500"
                          : "text-green-600"
                      }`}
                  >
                    {stat.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stat.change}
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          {dailyMetrics.length === 0 ? (
            /* Empty State for Charts */
            <Card className="lg:col-span-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No analytics data yet</h3>
                <p className="text-sm max-w-[400px] mt-2">
                  Once you start sending campaigns, we'll track your daily performance and engagement metrics here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Area Chart - Daily Performance */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Daily Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyMetrics}>
                        <defs>
                          <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(145, 80%, 40%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(145, 80%, 40%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(200, 80%, 50%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(200, 80%, 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sent"
                          stroke="hsl(145, 80%, 40%)"
                          fillOpacity={1}
                          fill="url(#colorSent)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="opened"
                          stroke="hsl(200, 80%, 50%)"
                          fillOpacity={1}
                          fill="url(#colorOpened)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart - Replies */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Replies by Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyMetrics}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="replied" name="Replies" fill="hsl(145, 80%, 40%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="opened" name="Opens" fill="hsl(145, 60%, 70%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Sent Emails */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Sent Emails</CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentSentEmails || recentSentEmails.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No emails sent yet. Start by creating drafts and sending them.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentSentEmails.slice(0, 5).map((email, index) => (
                  <div key={email.id || index} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {email.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {email.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Sent {email.sentAt ? new Date(email.sentAt).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

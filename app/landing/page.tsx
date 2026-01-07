"use client"

import Link from "next/link"
import { ArrowRight, Sparkles, Users, FileEdit, BarChart3, Zap, Target, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
                <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <img src="/salesmatter-logo.svg" alt="SalesMatter" className="h-8 w-auto" />
                    </div>
                    <Link href="/">
                        <Button className="gap-2">
                            Dashboard
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-32 pb-20">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
                <div className="absolute top-20 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/30 rounded-full blur-3xl opacity-20" />

                <div className="relative mx-auto max-w-7xl px-6">
                    <div className="mx-auto max-w-3xl text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8">
                            <Sparkles className="h-4 w-4" />
                            AI-Powered Cold Outreach
                        </div>

                        {/* Main headline */}
                        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                            Turn Leads Into
                            <span className="block text-primary mt-2">Conversations</span>
                        </h1>

                        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                            SalesMatter uses GPT-4o-mini web search to research your prospects and craft
                            hyper-personalized cold emails that actually get responses.
                        </p>

                        {/* CTA */}
                        <div className="mt-10 flex items-center justify-center gap-4">
                            <Link href="/">
                                <Button size="lg" className="gap-2 text-base px-8 py-6">
                                    Go to Dashboard
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-24 bg-muted/30">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                            How It Works
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Three simple steps to personalized outreach at scale
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        {/* Step 1 */}
                        <div className="relative rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                                1
                            </div>
                            <div className="mt-4">
                                <div className="rounded-xl bg-primary/10 p-3 w-fit">
                                    <Users className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="mt-4 text-xl font-semibold text-foreground">Import Your Leads</h3>
                                <p className="mt-3 text-muted-foreground">
                                    Upload a CSV or Excel file with your lead list. Our AI automatically maps columns
                                    including Company URL and LinkedIn profiles for deeper research.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                                2
                            </div>
                            <div className="mt-4">
                                <div className="rounded-xl bg-primary/10 p-3 w-fit">
                                    <Sparkles className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="mt-4 text-xl font-semibold text-foreground">AI Researches Each Lead</h3>
                                <p className="mt-3 text-muted-foreground">
                                    GPT-4o-mini searches the web in real-time—visiting company websites,
                                    LinkedIn profiles, and news—to find personalization hooks.
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                                3
                            </div>
                            <div className="mt-4">
                                <div className="rounded-xl bg-primary/10 p-3 w-fit">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="mt-4 text-xl font-semibold text-foreground">Get Personalized Drafts</h3>
                                <p className="mt-3 text-muted-foreground">
                                    Review AI-generated email drafts with personalized talking points.
                                    Edit if needed, then send directly or export to your email tool.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                            Why SalesMatter?
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Built for sales teams who want quality over quantity
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Feature 1 */}
                        <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors">
                            <div className="rounded-lg bg-primary/10 p-2.5 w-fit">
                                <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-foreground">Real-Time Web Search</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                GPT-4o-mini searches the web live to find the latest news, updates, and insights about each prospect.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors">
                            <div className="rounded-lg bg-primary/10 p-2.5 w-fit">
                                <Target className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-foreground">Deep Personalization</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Include Company URLs and LinkedIn profiles for significantly better research and personalization.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors">
                            <div className="rounded-lg bg-primary/10 p-2.5 w-fit">
                                <FileEdit className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-foreground">Human-in-the-Loop</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Review and edit every draft before sending. You're always in control of your outreach.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors">
                            <div className="rounded-lg bg-primary/10 p-2.5 w-fit">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-foreground">Smart Column Mapping</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                AI automatically maps your CSV columns—no manual field matching required.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors">
                            <div className="rounded-lg bg-primary/10 p-2.5 w-fit">
                                <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-foreground">Email Analytics</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Track opens, clicks, and replies. See what's working and optimize your outreach strategy.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors">
                            <div className="rounded-lg bg-primary/10 p-2.5 w-fit">
                                <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-foreground">Regenerate Anytime</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Not happy with a draft? Regenerate with fresh research at the click of a button.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                <div className="mx-auto max-w-4xl px-6 text-center">
                    <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                        Ready to Transform Your Outreach?
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Start sending personalized cold emails that actually get responses.
                    </p>
                    <div className="mt-8">
                        <Link href="/">
                            <Button size="lg" className="gap-2 text-base px-8 py-6">
                                Go to Dashboard
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-12">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                        <div className="flex items-center gap-3">
                            <img src="/salesmatter-logo.svg" alt="SalesMatter" className="h-6 w-auto opacity-70" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} SalesMatter. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

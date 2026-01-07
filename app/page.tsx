"use client"

import Link from "next/link"
import { ArrowRight, Sparkles, Users, FileEdit, BarChart3, Zap, Target, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
            {/* Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-700">
                <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <img src="/salesmatter-logo.svg" alt="SalesMatter" className="h-8 w-auto" />
                    </div>
                    <Link href="/dashboard">
                        <Button className="gap-2 transition-transform hover:scale-105">
                            Dashboard
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-36 pb-24 lg:pt-48 lg:pb-32">
                {/* Background gradients */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
                <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-30 animate-pulse delay-700" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] opacity-20 animate-pulse delay-1000" />

                <div className="relative mx-auto max-w-7xl px-6">
                    <div className="mx-auto max-w-4xl text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8 animate-in fade-in zoom-in duration-700 delay-100 border border-primary/20">
                            <Sparkles className="h-4 w-4" />
                            AI-Powered Cold Outreach
                        </div>

                        {/* Main headline */}
                        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            Turn Leads Into
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-600 mt-2 pb-2">Conversations</span>
                        </h1>

                        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            SalesMatter uses GPT-4o-mini web search to research your prospects and craft
                            hyper-personalized cold emails that actually get responses.
                        </p>

                        {/* CTA */}
                        <div className="mt-10 flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                            <Link href="/dashboard">
                                <Button size="lg" className="gap-2 text-base px-8 py-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:shadow-primary/30">
                                    Go to Dashboard
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            </Link>
                        </div>

                        {/* Dashboard Mockup Representation */}
                        <div className="mt-20 relative mx-auto w-full max-w-5xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 group perspective-1000">
                            <div className="relative rounded-xl border border-border bg-card/50 backdrop-blur-sm p-2 shadow-2xl transition-transform duration-500 group-hover:rotate-x-2">
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-xl" />
                                <div className="relative ascept-[16/9] overflow-hidden rounded-lg border border-border bg-background">
                                    {/* Mockup Header */}
                                    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
                                        <div className="flex gap-1.5">
                                            <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                                            <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                                        </div>
                                        <div className="ml-4 h-2 w-32 rounded-full bg-muted-foreground/10" />
                                    </div>
                                    {/* Mockup Content Grid */}
                                    <div className="grid grid-cols-12 gap-0 h-[400px] lg:h-[500px]">
                                        {/* Sidebar */}
                                        <div className="col-span-2 border-r border-border bg-muted/10 p-4 space-y-3 hidden sm:block">
                                            {[...Array(6)].map((_, i) => (
                                                <div key={i} className="h-8 w-full rounded-md bg-muted-foreground/5 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                                            ))}
                                        </div>
                                        {/* Main Area */}
                                        <div className="col-span-12 sm:col-span-10 p-6 space-y-6 bg-background">
                                            <div className="flex justify-between items-center">
                                                <div className="h-8 w-48 rounded-md bg-muted-foreground/10" />
                                                <div className="h-8 w-24 rounded-md bg-primary/20" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="h-24 rounded-lg border border-border bg-card p-4 space-y-2">
                                                        <div className="h-4 w-8 rounded bg-primary/10" />
                                                        <div className="h-6 w-16 rounded bg-muted-foreground/10" />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="h-64 rounded-lg border border-border bg-muted/5 flex items-center justify-center">
                                                <div className="text-center space-y-3">
                                                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Sparkles className="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div className="h-4 w-32 mx-auto rounded bg-muted-foreground/10" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Glow effect behind mockup */}
                            <div className="absolute -inset-4 bg-primary/20 blur-3xl -z-10 opacity-40 rounded-[3rem]" />
                        </div>

                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-24 bg-muted/30 border-y border-border/50">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 view-timeline-name:--reveal view-timeline-axis:block">
                        <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                            How It Works
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Three simple steps to personalized outreach at scale
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        {/* Step 1 */}
                        <div className="group relative rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                            <div className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">
                                1
                            </div>
                            <div className="mt-4">
                                <div className="rounded-xl bg-primary/10 p-3 w-fit group-hover:bg-primary/20 transition-colors">
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
                        <div className="group relative rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                            <div className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">
                                2
                            </div>
                            <div className="mt-4">
                                <div className="rounded-xl bg-primary/10 p-3 w-fit group-hover:bg-primary/20 transition-colors">
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
                        <div className="group relative rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                            <div className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">
                                3
                            </div>
                            <div className="mt-4">
                                <div className="rounded-xl bg-primary/10 p-3 w-fit group-hover:bg-primary/20 transition-colors">
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
            <section className="py-24 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />

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
                        {[
                            { icon: Zap, title: "Real-Time Web Search", text: "GPT-4o-mini searches the web live to find the latest news, updates, and insights about each prospect." },
                            { icon: Target, title: "Deep Personalization", text: "Include Company URLs and LinkedIn profiles for significantly better research and personalization." },
                            { icon: FileEdit, title: "Human-in-the-Loop", text: "Review and edit every draft before sending. You're always in control of your outreach." },
                            { icon: Users, title: "Smart Column Mapping", text: "AI automatically maps your CSV columns—no manual field matching required." },
                            { icon: BarChart3, title: "Email Analytics", text: "Track opens, clicks, and replies. See what's working and optimize your outreach strategy." },
                            { icon: Sparkles, title: "Regenerate Anytime", text: "Not happy with a draft? Regenerate with fresh research at the click of a button." }
                        ].map((feature, i) => (
                            <div key={i} className="group rounded-xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                                <div className="rounded-lg bg-primary/10 p-2.5 w-fit group-hover:bg-primary/20 transition-colors">
                                    <feature.icon className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {feature.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-t border-border/50">
                <div className="mx-auto max-w-4xl px-6 text-center">
                    <h2 className="text-3xl font-bold text-foreground sm:text-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                        Ready to Transform Your Outreach?
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                        Start sending personalized cold emails that actually get responses.
                    </p>
                    <div className="mt-8">
                        <Link href="/dashboard">
                            <Button size="lg" className="gap-2 text-base px-8 py-6 shadow-xl shadow-primary/20 transition-all hover:scale-105 hover:shadow-primary/30">
                                Go to Dashboard
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-12 bg-muted/20">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                        <div className="flex items-center gap-3">
                            <img src="/salesmatter-logo.svg" alt="SalesMatter" className="h-6 w-auto opacity-70 grayscale hover:grayscale-0 transition-all" />
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

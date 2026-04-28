import Link from "next/link"

const lime = "oklch(0.85 0.22 145)"
const limeDeep = "oklch(0.78 0.22 145)"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 selection:bg-[oklch(0.85_0.22_145)] selection:text-neutral-950 font-sans">
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200/70 bg-neutral-50/80 backdrop-blur">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3" aria-label="SalesMatter home">
            <img
              src="/salesmatter-logo.svg"
              alt="SalesMatter"
              className="h-14 w-auto"
            />
            <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-600">
              <span className="text-neutral-300 mr-1">·</span> Operator Edition
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-600 hover:text-neutral-950 px-3 py-2 transition-colors"
            >
              Sign in ↗
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-neutral-950 text-neutral-50 font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2.5 hover:bg-neutral-800 transition-colors"
            >
              Enter Dashboard
              <span aria-hidden>→</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 border-b border-neutral-200">
        {/* faint grid texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative mx-auto max-w-[1400px] px-6 grid lg:grid-cols-12 gap-12 items-end">
          {/* LEFT : type-driven anchor */}
          <div className="lg:col-span-7">
            <div className="flex items-baseline gap-4 mb-10">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500"
                style={{ color: limeDeep }}
              >
                ●
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                Edition 01 <span className="text-neutral-300 mx-2">/</span> Cold-email, considered
              </span>
            </div>

            <h1 className="font-display text-[3.25rem] sm:text-[4.5rem] lg:text-[5.5rem] leading-[0.95] tracking-[-0.025em] text-neutral-950">
              Cold email
              <br />
              that sounds like
              <br />
              <span className="font-display italic font-light">a person</span>{" "}
              <span
                className="inline-block align-baseline px-2 not-italic"
                style={{ backgroundColor: lime }}
              >
                wrote&nbsp;it.
              </span>
            </h1>

            <p className="mt-10 max-w-xl text-lg leading-relaxed text-neutral-700">
              Import a list. SalesMatter researches every name in real time and writes the
              email — operator voice, no templates, no jargon, every line earned.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-neutral-950 text-neutral-50 font-mono text-xs uppercase tracking-[0.18em] px-6 py-4 hover:bg-neutral-800 transition-colors"
              >
                Enter Dashboard
                <span aria-hidden>→</span>
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-neutral-700 px-2 py-4 border-b border-neutral-300 hover:border-neutral-950 hover:text-neutral-950 transition-colors"
              >
                Read the playbook
                <span aria-hidden>↓</span>
              </a>
            </div>

            <div className="mt-16 flex flex-col sm:flex-row gap-6 sm:gap-12 pt-8 border-t border-neutral-200">
              <Stat label="Personalization points / draft" value="04+" />
              <Stat label="Reading time" value="≈ 30 sec" />
              <Stat label="Templates used" value="None" />
            </div>
          </div>

          {/* RIGHT : draft email card (the hero artifact) */}
          <div className="lg:col-span-5">
            <DraftCard />
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ──────────────────────────────────────── */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:py-28">
          <p className="font-display text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-[-0.015em] text-neutral-950 max-w-4xl">
            We help operators stop sending email{" "}
            <em className="font-display italic" style={{ color: limeDeep }}>
              that sounds like email.
            </em>
          </p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            — House style, SalesMatter
          </p>
        </div>
      </section>

      {/* ── PROCESS ─────────────────────────────────────────── */}
      <section id="how" className="bg-neutral-950 text-neutral-50 border-b border-neutral-950">
        <div className="mx-auto max-w-[1400px] px-6 py-24 lg:py-32">
          <header className="grid lg:grid-cols-12 gap-8 mb-20">
            <div className="lg:col-span-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                Four <span className="text-neutral-600 mx-2">/</span> Stages
              </span>
            </div>
            <h2 className="lg:col-span-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-[-0.02em]">
              How a list becomes{" "}
              <em className="font-display italic" style={{ color: lime }}>
                a reply.
              </em>
            </h2>
          </header>

          <ol className="divide-y divide-neutral-800 border-t border-neutral-800">
            {STAGES.map((stage) => (
              <li
                key={stage.num}
                className="grid lg:grid-cols-12 gap-8 py-10 lg:py-14 group"
              >
                <div className="lg:col-span-4 flex items-baseline gap-4">
                  <span
                    className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500"
                  >
                    Stage
                  </span>
                  <span
                    className="font-display text-7xl sm:text-8xl lg:text-9xl leading-none tracking-tight"
                    style={{ color: lime }}
                  >
                    {stage.num}
                  </span>
                </div>
                <div className="lg:col-span-7 lg:col-start-6">
                  <h3 className="font-display text-3xl sm:text-4xl tracking-[-0.015em] text-neutral-50">
                    {stage.title}
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-neutral-300 max-w-2xl">
                    {stage.body}
                  </p>
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    {stage.tag}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── PRINCIPLES ──────────────────────────────────────── */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-[1400px] px-6 py-24 lg:py-32">
          <header className="mb-16">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              Why <span className="text-neutral-300 mx-2">/</span> It works
            </span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-[-0.02em] max-w-3xl">
              Three rules we don&apos;t break.
            </h2>
          </header>

          <div className="grid md:grid-cols-3 gap-px bg-neutral-200 border border-neutral-200">
            {PRINCIPLES.map((p, i) => (
              <article
                key={p.title}
                className="bg-neutral-50 p-8 lg:p-10 flex flex-col"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                  Rule 0{i + 1}
                </span>
                <h3 className="mt-4 font-display text-2xl lg:text-3xl leading-[1.1] tracking-[-0.015em] text-neutral-950">
                  {p.title}
                </h3>
                <p className="mt-6 text-base leading-relaxed text-neutral-700">
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ───────────────────────────────────────── */}
      <section style={{ backgroundColor: lime }} className="border-b border-neutral-950">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:py-28 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8">
            <p className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-[-0.02em] text-neutral-950">
              Stop sending email{" "}
              <em className="font-display italic">that sounds like email.</em>
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 bg-neutral-950 text-neutral-50 font-mono text-xs uppercase tracking-[0.18em] px-7 py-5 hover:bg-neutral-800 transition-colors"
            >
              Enter Dashboard
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="bg-neutral-50">
        <div className="mx-auto max-w-[1400px] px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <img
            src="/salesmatter-logo.svg"
            alt="SalesMatter"
            className="h-16 w-auto"
          />
          <span className="sr-only">SalesMatter</span>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            © {new Date().getFullYear()} <span className="text-neutral-300 mx-2">·</span>{" "}
            Built for operators, by operators
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ── Sub-components ────────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-3xl sm:text-4xl tracking-tight text-neutral-950">
        {value}
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
    </div>
  )
}

function DraftCard() {
  return (
    <div className="border border-neutral-950 bg-neutral-50 shadow-[8px_8px_0_0_oklch(0.85_0.22_145)]">
      {/* meta strip */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
          Draft 03 <span className="text-neutral-300 mx-1">/</span> 04
        </span>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: limeDeep }}
            aria-hidden
          />
          Generated 12 sec ago
        </span>
      </div>

      {/* address block */}
      <dl className="px-5 py-4 space-y-1.5 border-b border-neutral-200">
        <Row k="From" v="carl@salesmatter.co.za" />
        <Row k="To" v="wayne.bischoff@mediamark.co.za" />
        <Row k="Subj" v="Connecting Mediamark outbound" emphasis />
      </dl>

      {/* body */}
      <div className="px-5 py-6 text-[15px] leading-[1.7] text-neutral-800 space-y-4">
        <p>Hello Wayne,</p>
        <p>
          I came across Mediamark&apos;s positioning as a multi-channel sales house
          bridging advertisers with platforms like Odeeo and VIU. It feels like a
          model that depends heavily on continuous outreach to keep deal flow
          active.
        </p>
        <p>
          We specialise in working with CEOs and revenue leaders in media and
          digital sales organisations who are looking for more structured outbound
          systems without losing personalisation.
        </p>
        <p className="text-neutral-500">
          We help them minimise inconsistent follow-ups and grow pipeline quality
          through more relevant outreach…
        </p>
      </div>

      {/* footer strip */}
      <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 bg-neutral-100/60">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
          Personalization · 04
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
          Reading time · 27 sec
        </span>
      </div>
    </div>
  )
}

function Row({ k, v, emphasis }: { k: string; v: string; emphasis?: boolean }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 items-baseline">
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-400">
        {k}
      </dt>
      <dd
        className={
          emphasis
            ? "font-display text-lg leading-snug tracking-tight text-neutral-950"
            : "font-mono text-[12px] text-neutral-700"
        }
      >
        {v}
      </dd>
    </div>
  )
}

/* ── Content ───────────────────────────────────────────────── */

const STAGES = [
  {
    num: "01",
    title: "List.",
    body: "Drop a CSV or Excel file. Columns map themselves — first name, role, company URL, LinkedIn — without a configuration screen.",
    tag: "Smart import · No field-matching",
  },
  {
    num: "02",
    title: "Research.",
    body: "For every name, real-time web search picks up news, role updates, partnerships. The model reads the company before it writes a word.",
    tag: "Live web · Per-prospect context",
  },
  {
    num: "03",
    title: "Draft.",
    body: "Operator-voice email, written to the person — not the segment. Every draft cites at least four real personalization points from research.",
    tag: "Carl Davis XYZ structure · Human-editable",
  },
  {
    num: "04",
    title: "Ship.",
    body: "Review, edit a line, regenerate with fresh research, or hand it to your sequencer. You stay in the loop on every send.",
    tag: "Human-in-the-loop · Bulk send",
  },
] as const

const PRINCIPLES = [
  {
    title: "Lists are not people.",
    body: "Research happens per-name, every time. No spray-and-pray, no lookalike segments — every email starts from what is actually true about the prospect this week.",
  },
  {
    title: "Replaceable copy gets archived.",
    body: "We write in operator voice — short, specific, slightly imperfect. If a draft could plausibly come from a template, the system rewrites it before you see it.",
  },
  {
    title: "A meeting is the only metric.",
    body: "Opens are noise, clicks are circumstantial. We optimise for the line of the funnel that actually matters — replies that turn into conversations.",
  },
] as const

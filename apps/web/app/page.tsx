import Link from "next/link";
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Search, 
  Stethoscope, 
  CheckCircle2, 
  RotateCcw, 
  Activity, 
  FileText,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecoveryMetrics } from "@/lib/recovery/recovery-service";
import { listReconciliationRuns } from "@/lib/reconciliation/run-service";

export const dynamic = "force-dynamic";

function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default async function HomePage() {
  const [metrics, runs] = await Promise.all([
    getRecoveryMetrics().catch(() => null),
    listReconciliationRuns().catch(() => []),
  ]);

  const latestRun = runs[0] ?? null;
  const matchRate = latestRun ? Number(latestRun.matchRate) : 0;
  const exceptionCount = latestRun ? latestRun.exceptionCount : 0;
  const revenueAtRisk = metrics?.totalRevenueAtRiskPaise ?? 0;

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground selection:bg-primary/20">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="font-semibold leading-none">SettleIQ</p>
              <p className="text-xs text-muted-foreground mt-1">AI Revenue Recovery</p>
            </div>
          </div>
          <Button size="sm" render={<Link href="/dashboard" />}>
            Open Dashboard
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-6 py-24 md:py-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 shadow-sm">
            <Sparkles className="mr-2 size-4" />
            AI REVENUE RECOVERY
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl text-balance">
            Recover revenue before it slips away.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10 text-balance leading-relaxed">
            SettleIQ uses AI agents to detect failed payments, understand why revenue is at risk, and take the right recovery action — with policy guardrails, human approval, and a complete audit trail.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button size="lg" className="h-12 px-8" render={<Link href="/dashboard" />}>
              Open Dashboard
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" render={<a href="#how-it-works" />}>
              See how it works ↓
            </Button>
          </div>
        </section>

        {/* WORKFLOW 4 STEPS */}
        <section id="how-it-works" className="border-y border-border/40 bg-muted/20 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-8 md:grid-cols-4 relative">
              <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-[2px] bg-border/60 -z-10" />
              
              <div className="flex flex-col items-center text-center bg-background p-6 rounded-2xl border border-border/50 shadow-sm relative">
                <div className="flex size-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 mb-6 border border-blue-500/20 shadow-sm">
                  <Search className="size-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-tight">DETECT</h3>
                <p className="text-sm text-muted-foreground">Find payments and revenue at risk.</p>
              </div>

              <div className="flex flex-col items-center text-center bg-background p-6 rounded-2xl border border-border/50 shadow-sm relative">
                <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-6 border border-amber-500/20 shadow-sm">
                  <Stethoscope className="size-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-tight">DIAGNOSE</h3>
                <p className="text-sm text-muted-foreground">Identify root causes using transaction signals and payment context.</p>
              </div>

              <div className="flex flex-col items-center text-center bg-background p-6 rounded-2xl border border-border/50 shadow-sm relative">
                <div className="flex size-14 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 mb-6 border border-indigo-500/20 shadow-sm">
                  <Activity className="size-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-tight">DECIDE</h3>
                <p className="text-sm text-muted-foreground">Choose the safest recovery intervention within policy.</p>
              </div>

              <div className="flex flex-col items-center text-center bg-background p-6 rounded-2xl border border-border/50 shadow-sm relative">
                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-6 border border-emerald-500/20 shadow-sm">
                  <RotateCcw className="size-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-tight">RECOVER</h3>
                <p className="text-sm text-muted-foreground">Execute bounded recovery and measure the outcome.</p>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="py-24 mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">From payment failure to recovered revenue</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Real-time visibility into your reconciliation health and operations.</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 flex flex-col items-center text-center shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-4">Revenue at Risk</p>
              <p className="text-5xl font-extrabold tracking-tight tabular-nums text-foreground">{formatCurrency(revenueAtRisk)}</p>
            </div>
            
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 flex flex-col items-center text-center shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-4">Reconciliation Match Rate</p>
              <div className="flex items-end gap-1">
                <p className="text-5xl font-extrabold tracking-tight tabular-nums text-foreground">{matchRate.toFixed(1)}</p>
                <span className="text-3xl text-foreground font-bold mb-1">%</span>
              </div>
            </div>
            
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 flex flex-col items-center text-center shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-4">Exceptions</p>
              <p className="text-5xl font-extrabold tracking-tight tabular-nums text-foreground">{exceptionCount}</p>
            </div>
          </div>
        </section>

        {/* WORKFLOW VISUAL */}
        <section className="border-y border-border/40 bg-muted/10 py-24">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">AI that doesn&apos;t just recommend. It acts.</h2>
              <p className="text-muted-foreground">An autonomous engine bounded by strict policy guardrails.</p>
            </div>

            <div className="relative pl-8 md:pl-0">
              <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-[2px] bg-border/60 md:-translate-x-1/2" />
              
              {[
                { title: "Payment failure detected", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                { title: "Root cause identified", icon: Search, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                { title: "Recovery strategy selected", icon: Activity, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
                { title: "Policy checks applied", icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                { title: "Human approval when required", icon: CheckCircle2, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
                { title: "Recovery executed", icon: RotateCcw, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                { title: "Outcome recorded", icon: FileText, color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
              ].map((step, idx) => (
                <div key={idx} className="relative flex items-center mb-12 last:mb-0 md:justify-center">
                  <div className={`hidden md:flex w-1/2 pr-12 justify-end ${idx % 2 === 0 ? "opacity-100" : "opacity-0"}`}>
                    <h4 className="text-lg font-semibold">{step.title}</h4>
                  </div>
                  
                  <div className={`absolute left-0 md:relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border shadow-sm bg-background ${step.border} ${step.color}`}>
                    <div className={`flex size-full items-center justify-center rounded-full ${step.bg}`}>
                      <step.icon className="size-5" />
                    </div>
                  </div>

                  <div className={`w-full pl-6 md:w-1/2 md:pl-12 flex ${idx % 2 === 0 ? "md:hidden" : "md:flex"}`}>
                    <h4 className="text-lg font-semibold">{step.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
            Turn payment failures into recovered revenue.
          </h2>
          <Button size="lg" className="h-14 px-8 text-base" render={<Link href="/dashboard" />}>
            Open SettleIQ Dashboard
            <ArrowRight className="ml-2 size-5" />
          </Button>
        </section>
      </main>
    </div>
  );
}

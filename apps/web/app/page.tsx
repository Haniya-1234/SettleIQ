import Link from "next/link";
import { ArrowRight, Database, Plug, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const setupSteps = [
  {
    icon: Database,
    title: "Connect database",
    description:
      "Set DATABASE_URL in .env and run pnpm db:push to initialize the schema.",
  },
  {
    icon: Plug,
    title: "Connect Razorpay",
    description:
      "Add your Razorpay test API keys in Settings to enable payment sync (Phase 1).",
  },
  {
    icon: Shield,
    title: "Run reconciliation",
    description:
      "Once data is synced, agents will match transactions and surface anomalies (Phase 2+).",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="font-semibold leading-none">SettleIQ</p>
              <p className="text-xs text-muted-foreground">
                Agentic Payment Operations
              </p>
            </div>
          </div>
          <Button render={<Link href="/dashboard" />}>
            Open Dashboard
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-16">
        <section className="max-w-2xl space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Razorpay Buildathon
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Reconcile payments. Investigate anomalies. Resolve with confidence.
          </h1>
          <p className="text-lg text-muted-foreground">
            SettleIQ uses AI agents to match Razorpay transactions against your
            orders, investigate discrepancies with full audit trails, and
            propose resolutions — with human approval for every high-impact
            action.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {setupSteps.map((step) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <step.icon className="size-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Getting started</CardTitle>
            <CardDescription>
              Phase 0 foundation is ready. Configure your environment and open
              the dashboard to begin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Copy <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env.example</code> to <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env</code></p>
            <p>2. Run <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pnpm install</code> and <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pnpm db:push</code></p>
            <p>3. Run <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pnpm dev</code> and visit the dashboard</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

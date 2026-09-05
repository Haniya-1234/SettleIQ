import type { Metadata } from "next";
import { 
  CheckCircle2, 
  Database, 
  Info, 
  Settings, 
  ShieldCheck, 
  Sparkles, 
  Wallet, 
  XCircle 
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Settings | SettleIQ",
};

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const integrations = [
    {
      name: "Razorpay",
      description: "Payment processing and transaction data.",
      supportingText: "Orders, payments and settlements used for reconciliation and recovery.",
      icon: Wallet,
      configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    },
    {
      name: "PostgreSQL",
      description: "Application data and reconciliation storage.",
      supportingText: "Stores cases, reconciliation results and audit history.",
      icon: Database,
      configured: !!process.env.DATABASE_URL,
    },
    {
      name: "AI Engine",
      description: "AI-powered payment diagnosis and recovery recommendations.",
      supportingText: "Provides autonomous resolutions and recommendations.",
      icon: Sparkles,
      configured: !!process.env.OPENAI_API_KEY,
    },
    {
      name: "Authentication",
      description: "Secure access to the SettleIQ workspace.",
      supportingText: "Manages users, sessions, and role-based access.",
      icon: ShieldCheck,
      configured: !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
    }
  ];

  const configuredCount = integrations.filter((i) => i.configured).length;
  const totalCount = integrations.length;
  const allConfigured = configuredCount === totalCount;

  return (
    <DashboardShell
      title="Settings"
      description="Manage your payment integrations and system connections."
    >
      <div className="flex flex-col gap-8 pb-8">
        
        {/* System Summary Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/80 bg-gradient-to-r from-card via-card/90 to-card/70 p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-inner">
              <Settings className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Integrations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {configuredCount} of {totalCount} core services connected
              </p>
            </div>
          </div>
          <div>
            {allConfigured ? (
              <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 py-1.5 px-3">
                <CheckCircle2 className="size-3.5" />
                System fully operational
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 py-1.5 px-3">
                <XCircle className="size-3.5" />
                Attention required
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Integrations</h3>
            <p className="text-sm text-muted-foreground mt-1">Connect the services that power SettleIQ&apos;s payment operations.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.name} className="flex flex-col border border-border/80 shadow-sm overflow-hidden transition-all hover:shadow-md group">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-5">
                      <div className={`flex size-12 items-center justify-center rounded-xl border shadow-inner transition-colors ${
                        integration.configured 
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20" 
                          : "border-border bg-muted/40 text-muted-foreground"
                      }`}>
                        <Icon className="size-6" />
                      </div>
                      
                      <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${
                        integration.configured 
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                          : "border-muted-foreground/30 text-muted-foreground"
                      }`}>
                        {integration.configured ? "Connected" : "Not Configured"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-6 flex-1">
                      <h4 className="text-base font-bold tracking-tight">{integration.name}</h4>
                      <p className="text-sm font-medium text-foreground">{integration.description}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{integration.supportingText}</p>
                    </div>

                    <div className="mt-auto pt-4 border-t border-border flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Info className="size-3.5" />
                      Managed by workspace configuration
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {allConfigured && (
            <div className="mt-2 flex items-center justify-center p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold gap-2">
              <CheckCircle2 className="size-4" />
              All configured services are operational.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Settings",
};

const integrations = [
  {
    name: "PostgreSQL",
    envVar: "DATABASE_URL",
    phase: "Phase 0",
    status: "required" as const,
  },
  {
    name: "Razorpay",
    envVar: "RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET",
    phase: "Phase 1",
    status: "pending" as const,
  },
  {
    name: "Clerk Auth",
    envVar: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY",
    phase: "Phase 1",
    status: "pending" as const,
  },
  {
    name: "OpenAI",
    envVar: "OPENAI_API_KEY",
    phase: "Phase 3",
    status: "pending" as const,
  },
] as const;

export default function SettingsPage() {
  return (
    <DashboardShell
      title="Settings"
      description="Integrations and configuration"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Settings className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Integrations</CardTitle>
              <CardDescription>
                Configure external services via environment variables. See{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  .env.example
                </code>{" "}
                for all required keys.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-lg border">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {integration.envVar}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {integration.phase}
                  </Badge>
                  <Badge
                    variant={
                      integration.status === "required" ? "default" : "secondary"
                    }
                    className="text-[10px] capitalize"
                  >
                    {integration.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

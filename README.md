# SettleIQ

### AI-Powered Payment Operations & Revenue Recovery for Razorpay Merchants

SettleIQ is a production-oriented fintech platform that helps Razorpay merchants **detect revenue at risk, investigate payment and reconciliation anomalies, determine the safest recovery action, and execute bounded recovery workflows with human approval and complete auditability.**

Built for the **Razorpay Buildathon — AI Revenue Recovery Track**.

---

## 🚀 What SettleIQ Does

Payment failures and reconciliation discrepancies can leave revenue stuck, delayed, or at risk.

SettleIQ turns these operational problems into an actionable workflow:

**Detect → Investigate → Diagnose → Decide → Approve → Recover → Audit**

Instead of simply reporting that a payment failed, SettleIQ answers:

- **What happened?**
- **Why did it happen?**
- **How much revenue is at risk?**
- **What should be done next?**
- **Is automated recovery safe?**
- **Does the action require human approval?**
- **What happened after the action was executed?**

Every important decision is recorded in an auditable agent timeline.

---

## ✨ Key Capabilities

### 🔎 Revenue-at-Risk Detection

Identifies payment failures and reconciliation anomalies that may represent recoverable revenue.

### 🧠 AI-Assisted Investigation

Investigates cases using available transaction and payment evidence to determine likely failure causes and recovery strategies.

### ⚖️ Policy-Based Guardrails

Recovery actions are evaluated against configurable safety rules before execution.

Actions can be:

- Approved automatically
- Sent for human approval
- Blocked when policy conditions are not satisfied

### 👤 Human-in-the-Loop Recovery

High-impact recovery actions require explicit human approval before execution.

This prevents an automated system from taking potentially unsafe financial actions.

### 💰 Recovery Execution

Once approved, SettleIQ executes a bounded recovery workflow and records:

- Recovery status
- Recovered amount
- Action performed
- External reference
- Final resolution

### 📊 Reconciliation

Matches Razorpay orders, payments, and settlements and surfaces exceptions requiring investigation.

### 🧾 Complete Audit Trail

Agent activity is captured across the investigation and recovery lifecycle, including:

- Agent runs
- Agent steps
- Tool invocations
- Policy decisions
- Human approvals
- Execution results
- Final resolution

---

# 🏗️ Architecture

SettleIQ is implemented as a **pnpm monorepo** with separate packages for the web application, database layer, shared types, agents, Razorpay integration, and reconciliation engine.

```text
SettleIQ
│
├── apps/
│   └── web/
│       ├── Next.js application
│       ├── Dashboard UI
│       ├── Case management
│       └── API routes
│
├── packages/
│   ├── db/
│   │   └── Prisma + PostgreSQL
│   │
│   ├── shared/
│   │   └── Shared TypeScript types + Zod schemas
│   │
│   ├── agents/
│   │   ├── Agent orchestration
│   │   ├── Recovery policy engine
│   │   └── Recovery execution
│   │
│   ├── razorpay/
│   │   └── Typed Razorpay API client
│   │
│   └── reconciliation/
│       ├── Matching engine
│       ├── Synthetic dataset generation
│       └── Reconciliation logic
│
└── PostgreSQL

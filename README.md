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

🛠️ Tech Stack
Layer	Technology
Frontend	Next.js, React, TypeScript
Styling	Tailwind CSS, shadcn/ui
Backend	Next.js API Routes
Database	PostgreSQL
ORM	Prisma
AI / Agents	Agent orchestration + policy engine
Payments	Razorpay APIs
Validation	Zod
Package Manager	pnpm
Deployment	Vercel
Development	Git, GitHub, VS Code
🔄 Core Workflow
1. Detect

SettleIQ ingests payment and reconciliation information and identifies cases that may represent revenue risk.

Payment Failure
       │
       ▼
Reconciliation / Payment Analysis
       │
       ▼
Revenue-at-Risk Case
2. Investigate

The system collects available evidence around the case.

Examples include:

Payment status
Failure reason
Retry history
Transaction information
Reconciliation state
Amount at risk
3. Diagnose

The system determines the most likely operational cause and evaluates whether the case is recoverable.

Example:

Payment
   │
   ├── Status: Failed
   ├── Failure: Insufficient Funds
   ├── Retry Count: 1
   └── Amount at Risk: ₹2,082.06
              │
              ▼
       Recovery Candidate
4. Decide

The recovery strategy is evaluated against policy.

                    Recovery Strategy
                           │
                           ▼
                    Policy Evaluation
                     /       |       \
                    /        |        \
               BLOCKED   APPROVAL   APPROVED
                            │
                            ▼
                     Human Approval

This ensures that the agent does not blindly execute every recommendation.

5. Recover

After approval, a bounded recovery action is executed.

The system records the outcome, including the recovered amount and execution reference.

6. Audit

Every significant action contributes to the case timeline.

Detection
    ↓
Evidence Collection
    ↓
Diagnosis
    ↓
Strategy
    ↓
Policy Decision
    ↓
Human Approval
    ↓
Recovery Execution
    ↓
Final Resolution
📊 Reconciliation

SettleIQ includes a deterministic reconciliation engine for comparing payment, order, and settlement records.

The buildathon demonstration dataset produced:

Metric	Result
Total Records	110
Matched	84
Mismatched	15
Unmatched	11
Exceptions	26
Match Rate	76.4%

These exceptions become investigation cases that can be reviewed through the recovery operations interface.

💳 Example Recovery Case

One demonstrated recovery case:

Payment PAY_0105
Signal	Value
Amount at Risk	₹2,082.06
Failure Reason	Insufficient Funds
Retry Count	1
AI Recommendation	RETRY_LATER
Confidence	82%
Human Approval	Required
Policy Decision	Approved
Execution	Simulated Success
Recovered	₹2,082.06
External Reference	sim-pay_0105
Final Status	Recovered

The case demonstrates the complete flow from detection to investigation, policy evaluation, human approval, bounded execution, and final resolution.

🧩 Database Model

Core entities include:

organizations
      │
      ├── payments
      ├── orders
      ├── settlements
      │
      └── cases
             │
             ├── agent_runs
             │      └── agent_steps
             │
             └── tool_invocations
Main Entities

Organizations

Merchant accounts using the platform.

Payments

Payment-level transaction information.

Orders

Order information associated with payments.

Settlements

Settlement records used for reconciliation.

Cases

Revenue-risk and reconciliation cases requiring investigation.

Agent Runs

Execution records for agent workflows.

Agent Steps

Individual stages performed during an agent run.

Tool Invocations

Traceability for tools used during agent workflows.

🔐 Safety & Reliability

Financial recovery workflows require stronger safeguards than a simple automated action.

SettleIQ therefore uses multiple layers of protection.

Human Approval

High-impact actions can require explicit operator approval.

Policy Evaluation

Recovery actions are evaluated before execution.

Bounded Execution

The recovery executor only performs actions permitted by the approved workflow.

Auditability

Recovery decisions and execution results are persisted for later inspection.

Synthetic Data Isolation

Synthetic buildathon data is explicitly marked and isolated from real merchant records during cleanup and persistence operations.

Environment Security

Secrets are provided through environment configuration and are not committed to the repository.

Never commit .env files or expose Razorpay credentials.

🖥️ Application

The web application provides dedicated interfaces for:

Revenue Recovery Dashboard

Overview of:

Revenue at risk
Revenue recovered
Recovery rate
Open cases
Pending approvals
Recovery pipeline
Recovery Cases

View and investigate individual revenue-risk cases with:

Exposure
Failure reason
AI recommendation
Confidence
Current status
Case Investigation

Detailed case view containing:

Investigation summary
Evidence signals
Diagnosis
Recommended action
Policy decision
Recovery execution
Agent activity
Audit trail
Reconciliation

Review:

Match rate
Matched records
Mismatches
Unmatched records
Exceptions
Reconciliation run history
System Health

Monitor the status of:

Razorpay integration
PostgreSQL
AI engine
Application environment
⚙️ Getting Started
Prerequisites
Node.js >= 20
pnpm >= 10
PostgreSQL database
1. Clone the Repository
git clone https://github.com/Haniya-1234/SettleIQ.git
cd SettleIQ
2. Install Dependencies
pnpm install
3. Configure Environment Variables

Create a local environment file:

cp .env.example .env

Configure the required database and application variables.

At minimum:

DATABASE_URL=your_postgresql_connection_string
NEXT_PUBLIC_APP_URL=http://localhost:3000

For Razorpay integration, configure the required Razorpay credentials in your local environment.

Never commit secrets to Git.

4. Generate Prisma Client
pnpm db:generate
5. Push the Database Schema
pnpm db:push
6. Start the Application
pnpm dev

Open:

http://localhost:3000
📦 Available Commands
Command	Description
pnpm dev	Start development environment
pnpm build	Build packages and applications
pnpm lint	Run ESLint
pnpm typecheck	Run TypeScript checks
pnpm db:generate	Generate Prisma Client
pnpm db:push	Push Prisma schema to database
pnpm db:studio	Open Prisma Studio
🧪 Development Philosophy

SettleIQ was designed around a simple principle:

An AI system handling financial operations should not only make decisions — it should explain, constrain, and record them.

The platform therefore separates:

Detection
    ↓
Investigation
    ↓
Decision
    ↓
Policy
    ↓
Approval
    ↓
Execution
    ↓
Measurement
    ↓
Audit

This separation makes recovery workflows easier to inspect, test, and control.

🏆 Built for the Razorpay Buildathon

Track: AI Revenue Recovery

Project: SettleIQ

SettleIQ focuses on moving revenue operations beyond passive monitoring.

Don't just find the money slipping away. Recover it safely.

👩‍💻 Team

Built for the Razorpay Buildathon by:

Haniya Shaikh

📄 License

Private — Razorpay Buildathon submission.

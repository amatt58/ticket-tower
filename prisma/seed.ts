import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
});

type SeedMessage = {
  body: string;
  messageType: "customer_reply" | "agent_note" | "ai_draft" | "system";
  isInternal?: boolean;
  authorIsAgent?: boolean;
};

type SeedTicket = {
  title: string;
  description: string;
  status: "open" | "in_progress" | "pending" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  type: "bug" | "question" | "feature_request" | "incident" | "task";
  source: "email" | "web" | "api" | "internal";
  tags: string[];
  category?: string;
  assigned: boolean;
  messages: SeedMessage[];
};

const SEED_TICKETS: SeedTicket[] = [
  {
    title: "Invoice charged twice this month",
    description:
      "We were billed twice for our March subscription — once on the 1st and again on the 3rd. Can you refund the duplicate charge?",
    status: "in_progress",
    priority: "high",
    type: "bug",
    source: "email",
    tags: ["billing"],
    category: "billing",
    assigned: true,
    messages: [
      {
        body: "We were billed twice for our March subscription — once on the 1st and again on the 3rd. This is really frustrating, we run a small business and that's real cash flow impact. Can you refund the duplicate charge ASAP?",
        messageType: "customer_reply",
      },
      {
        body: "Thanks for flagging this — pulling up your billing history now, will confirm the duplicate and process a refund shortly.",
        messageType: "customer_reply",
        authorIsAgent: true,
      },
      {
        body: "Confirmed: duplicate charge caused by a retried webhook from the payment processor. Refund submitted, note added to account.",
        messageType: "agent_note",
        isInternal: true,
        authorIsAgent: true,
      },
      {
        body: "Still haven't seen the refund hit our account after 2 days, can you check again?",
        messageType: "customer_reply",
      },
    ],
  },
  {
    title: "How do I export my data as CSV?",
    description: "Looking for a way to export our ticket history as CSV for an internal audit.",
    status: "resolved",
    priority: "low",
    type: "question",
    source: "web",
    tags: ["export", "how-to"],
    category: "product",
    assigned: true,
    messages: [
      {
        body: "Looking for a way to export our ticket history as CSV for an internal audit. Is this possible from the dashboard?",
        messageType: "customer_reply",
      },
      {
        body: "Yes! Go to Settings > Data > Export, choose a date range, and it'll email you a CSV link. Let me know if you don't see that option.",
        messageType: "customer_reply",
        authorIsAgent: true,
      },
      {
        body: "Found it, thank you!",
        messageType: "customer_reply",
      },
    ],
  },
  {
    title: "Production API returning 500s intermittently",
    description:
      "Our integration has been getting sporadic 500 errors from /v1/tickets since about 14:00 UTC. Roughly 1 in 20 requests failing.",
    status: "open",
    priority: "critical",
    type: "incident",
    source: "api",
    tags: ["api", "outage"],
    category: "infrastructure",
    assigned: true,
    messages: [
      {
        body: "Our integration has been getting sporadic 500 errors from /v1/tickets since about 14:00 UTC. Roughly 1 in 20 requests failing. This is affecting our production checkout flow, need urgent help.",
        messageType: "customer_reply",
      },
      {
        body: "Escalating to on-call, checking API gateway logs for correlated errors around 14:00 UTC.",
        messageType: "agent_note",
        isInternal: true,
        authorIsAgent: true,
      },
      {
        body: "We're seeing the same pattern on our end, actively investigating a possible connection pool exhaustion issue. Will update within 30 minutes.",
        messageType: "customer_reply",
        authorIsAgent: true,
      },
    ],
  },
  {
    title: "Feature request: dark mode for the dashboard",
    description:
      "Would love a dark mode toggle — several of our team work late shifts and the bright UI is rough at night.",
    status: "open",
    priority: "low",
    type: "feature_request",
    source: "web",
    tags: ["ui", "feature-request"],
    category: "product",
    assigned: false,
    messages: [
      {
        body: "Would love a dark mode toggle — several of our team work late shifts and the bright UI is rough at night. Not urgent, just a nice-to-have!",
        messageType: "customer_reply",
      },
    ],
  },
  {
    title: "Can't reset password — reset email never arrives",
    description: "Requested a password reset three times, no email in inbox or spam folder.",
    status: "pending",
    priority: "medium",
    type: "bug",
    source: "email",
    tags: ["auth", "email-delivery"],
    category: "account",
    assigned: true,
    messages: [
      {
        body: "Requested a password reset three times over the last hour, no email in inbox or spam folder. I'm locked out of my account and have a client demo in 2 hours, please help.",
        messageType: "customer_reply",
      },
      {
        body: "Checked our mail provider logs — reset emails are being sent successfully but bouncing. Their domain may have an SPF/DKIM issue. Sent a manual reset link directly, waiting to hear back.",
        messageType: "agent_note",
        isInternal: true,
        authorIsAgent: true,
      },
      {
        body: "Sent you a manual reset link directly to this email — should arrive in the next few minutes. Let us know once you're back in.",
        messageType: "customer_reply",
        authorIsAgent: true,
      },
    ],
  },
  {
    title: "Onboard 12 new agent seats",
    description: "Internal task: provision accounts for the new support hires starting Monday.",
    status: "open",
    priority: "medium",
    type: "task",
    source: "internal",
    tags: ["onboarding"],
    category: "internal",
    assigned: true,
    messages: [
      {
        body: "Provisioning accounts for the 12 new support hires starting Monday. Need agent role, standard permissions.",
        messageType: "system",
      },
    ],
  },
  {
    title: "Extremely slow load times on the tickets page",
    description: "Ticket list is taking 10+ seconds to load since yesterday afternoon.",
    status: "in_progress",
    priority: "high",
    type: "bug",
    source: "web",
    tags: ["performance"],
    category: "infrastructure",
    assigned: true,
    messages: [
      {
        body: "Ticket list is taking 10+ seconds to load since yesterday afternoon. Getting complaints from our whole team, this is really hurting our workflow.",
        messageType: "customer_reply",
      },
      {
        body: "This is deeply frustrating — it's been over 24 hours now and we still see no improvement. Please escalate.",
        messageType: "customer_reply",
      },
      {
        body: "Identified as a missing index on a filtered query, fix in progress, ETA today.",
        messageType: "agent_note",
        isInternal: true,
        authorIsAgent: true,
      },
    ],
  },
  {
    title: "Question about SSO / SAML support",
    description:
      "Evaluating TicketTower for our org and need to know if SAML SSO is on the roadmap.",
    status: "closed",
    priority: "low",
    type: "question",
    source: "web",
    tags: ["sso", "sales"],
    category: "product",
    assigned: true,
    messages: [
      {
        body: "Evaluating TicketTower for our org (about 80 seats) and need to know if SAML SSO is on the roadmap before we commit.",
        messageType: "customer_reply",
      },
      {
        body: "SAML SSO isn't available yet but is on our near-term roadmap. Happy to follow up once it ships if that's useful.",
        messageType: "customer_reply",
        authorIsAgent: true,
      },
      {
        body: "Good to know, thanks — we'll revisit then.",
        messageType: "customer_reply",
      },
    ],
  },
];

const LOCAL_FALLBACK_PASSWORD = "changeme123"; // dev-only fixture, not a real secret

function isLocalDatabase(): boolean {
  const host = new URL(process.env.DATABASE_URL as string).hostname;
  return host === "localhost" || host === "127.0.0.1";
}

// Hosted databases (Neon) must get explicit passwords — the repo is public,
// so the local fallback would be a known credential on the live demo.
function seedPassword(envName: string): string {
  const value = process.env[envName]?.trim();
  if (value) return value;
  if (isLocalDatabase()) return LOCAL_FALLBACK_PASSWORD;
  throw new Error(`${envName} must be set when seeding a non-local database.`);
}

async function main() {
  const adminEmail = "admin@tickettower.local";
  const adminPassword = seedPassword("SEED_ADMIN_PASSWORD");
  // The agent account doubles as the public demo login on the deployed app.
  const agentEmail = "agent@tickettower.local";
  const agentPassword = seedPassword("SEED_AGENT_PASSWORD");

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const agentPasswordHash = await bcrypt.hash(agentPassword, 10);

  // Re-running the seed resets passwords, so credentials can be rotated in place.
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: adminEmail,
      name: "Admin Agent",
      passwordHash: adminPasswordHash,
      role: "admin",
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: agentEmail },
    update: { passwordHash: agentPasswordHash },
    create: {
      email: agentEmail,
      name: "Sam Agent",
      passwordHash: agentPasswordHash,
      role: "agent",
    },
  });

  console.log(`Seeded users: ${adminEmail}, ${agentEmail}`);

  const existingCount = await prisma.ticket.count();
  if (existingCount > 0) {
    console.log(`Skipping ticket seed — ${existingCount} ticket(s) already exist.`);
    return;
  }

  for (const seedTicket of SEED_TICKETS) {
    const ticket = await prisma.ticket.create({
      data: {
        title: seedTicket.title,
        description: seedTicket.description,
        status: seedTicket.status,
        priority: seedTicket.priority,
        type: seedTicket.type,
        source: seedTicket.source,
        tags: seedTicket.tags,
        category: seedTicket.category,
        createdById: admin.id,
        assignedToId: seedTicket.assigned ? agent.id : null,
      },
    });

    await prisma.ticketAuditEvent.create({
      data: {
        ticketId: ticket.id,
        actorId: admin.id,
        actorType: "user",
        eventType: "ticket_created",
      },
    });

    for (const message of seedTicket.messages) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: message.authorIsAgent
            ? agent.id
            : message.messageType === "system"
              ? null
              : null,
          body: message.body,
          messageType: message.messageType,
          isInternal: message.isInternal ?? false,
        },
      });

      await prisma.ticketAuditEvent.create({
        data: {
          ticketId: ticket.id,
          actorId: message.authorIsAgent ? agent.id : null,
          actorType: message.messageType === "system" ? "system" : "user",
          eventType: "message_sent",
        },
      });
    }
  }

  console.log(`Seeded ${SEED_TICKETS.length} tickets with realistic conversation threads.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

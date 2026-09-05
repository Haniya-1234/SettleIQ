import crypto from "node:crypto";
import { prisma, Prisma } from "@settleiq/db";
import { getOrCreateBuildathonOrganization } from "../org";
import { runRecoveryScanForOrganization } from "./recovery-service";

function verifySignature(payload: string, signature: string, secret: string) {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature),
  );
}

function parsePayload(rawPayload: string) {
  const parsed = JSON.parse(rawPayload) as Record<string, unknown>;
  return {
    eventType: String(parsed.event ?? "unknown"),
    payload: parsed,
  };
}

export async function ingestRazorpayWebhook(input: {
  rawPayload: string;
  signature: string | null;
  eventId: string | null;
}) {
  const organization = await getOrCreateBuildathonOrganization();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!input.signature) {
      throw new Error("Missing Razorpay webhook signature.");
    }

    if (!verifySignature(input.rawPayload, input.signature, webhookSecret)) {
      throw new Error("Invalid Razorpay webhook signature.");
    }
  }

  const parsed = parsePayload(input.rawPayload);

  // Extract the nested Razorpay event ID safely.
  // Razorpay webhook shape: { event, payload: { payment: { entity: { id } } } }
  const nestedPayload = parsed.payload.payload as Record<string, unknown> | undefined;
  const paymentWrapper = nestedPayload?.payment as Record<string, unknown> | undefined;
  const paymentEntity = paymentWrapper?.entity as Record<string, unknown> | undefined;

  const providerEventId =
    input.eventId ??
    String(paymentEntity?.id ?? crypto.randomUUID());

  const existingEvent = await prisma.webhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: "razorpay",
        providerEventId,
      },
    },
  });

  if (existingEvent) {
    return { duplicate: true, event: existingEvent };
  }

  const storedEvent = await prisma.webhookEvent.create({
    data: {
      organizationId: organization.id,
      provider: "razorpay",
      providerEventId,
      eventType: parsed.eventType,
      status: "received",
      payload: parsed.payload as Prisma.InputJsonValue,
    },
  });

  if (parsed.eventType === "payment.failed") {
    const payloadRoot = parsed.payload.payload as Record<string, unknown> | undefined;
    const paymentEntity = payloadRoot?.payment as Record<string, unknown> | undefined;
    const payment = paymentEntity?.entity as Record<string, unknown> | undefined;

    if (payment) {
      const amount = Number(payment.amount ?? 0);
      const metadata = (payment.notes as Record<string, unknown> | undefined) ?? {};

      await prisma.payment.upsert({
        where: {
          razorpayPaymentId: String(payment.id),
        },
        update: {
          organizationId: organization.id,
          razorpayOrderId: payment.order_id ? String(payment.order_id) : null,
          amount,
          currency: String(payment.currency ?? "INR"),
          status: "FAILED",
          method: payment.method ? String(payment.method) : null,
          email: payment.email ? String(payment.email) : null,
          contact: payment.contact ? String(payment.contact) : null,
          retryCount: Number(metadata.retry_count ?? 1),
          failureCode: payment.error_code ? String(payment.error_code) : null,
          failureDescription: payment.error_description
            ? String(payment.error_description)
            : "Webhook reported a failed payment.",
          lastFailedAt: new Date(),
          metadata: metadata as Prisma.InputJsonValue,
        },
        create: {
          organizationId: organization.id,
          razorpayPaymentId: String(payment.id),
          razorpayOrderId: payment.order_id ? String(payment.order_id) : null,
          amount,
          currency: String(payment.currency ?? "INR"),
          status: "FAILED",
          method: payment.method ? String(payment.method) : null,
          email: payment.email ? String(payment.email) : null,
          contact: payment.contact ? String(payment.contact) : null,
          retryCount: Number(metadata.retry_count ?? 1),
          failureCode: payment.error_code ? String(payment.error_code) : null,
          failureDescription: payment.error_description
            ? String(payment.error_description)
            : "Webhook reported a failed payment.",
          lastFailedAt: new Date(),
          metadata: metadata as Prisma.InputJsonValue,
        },
      });

      await runRecoveryScanForOrganization(organization.id);
    }
  }

  await prisma.webhookEvent.update({
    where: { id: storedEvent.id },
    data: {
      status: "processed",
      processedAt: new Date(),
    },
  });

  return { duplicate: false, event: storedEvent };
}

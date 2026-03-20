/**
 * Payment utility functions
 *
 * Provides helpers for computing visit amounts, validating access,
 * and safe payment creation with tenant isolation.
 */

import { db } from "@/data/api";
import type { MaintenancePlan, MaintenanceVisit, Payment } from "@/data/types";

// ---------------------------------------------------------------------------
// Pure helpers (no db access)
// ---------------------------------------------------------------------------

/**
 * Get the amount due for a visit.
 * Returns visit.amountDue if set, otherwise 0.
 * DO NOT compute from line items -- amounts are locked once set.
 */
export function getVisitAmountDue(visit: MaintenanceVisit | null | undefined): number {
  if (!visit) return 0;
  return visit.amountDue ?? 0;
}

/**
 * Compute the amount due for a visit based on plan pricing.
 * Priority order:
 * 1. Use existing amountDue if already set (never overwrite)
 * 2. Calculate from plan price_per_visit + upsells for this visit
 * 3. Fallback to 0 if no pricing available
 */
export function computeVisitAmountDue(
  visit: MaintenanceVisit | null | undefined,
  maintenancePlan: MaintenancePlan | null | undefined
): number {
  if (!visit) return 0;

  // Never overwrite existing amountDue (historical integrity)
  if (visit.amountDue != null) {
    return visit.amountDue;
  }

  // Calculate from plan pricing
  if (!maintenancePlan) return 0;

  const basePrice = maintenancePlan.price_per_visit || 0;

  // Add upsells scheduled for this specific visit date
  let upsellTotal = 0;
  try {
    const upsells = maintenancePlan.upsells;
    if (Array.isArray(upsells)) {
      const upsellsForThisVisit = upsells.filter(
        (u) => (u as unknown as Record<string, unknown>).scheduled_date === visit.visit_date
      );
      upsellTotal = upsellsForThisVisit.reduce((sum, u) => sum + (u.price || 0), 0);
    }
  } catch (e) {
    console.warn("Failed to parse upsells for amount calculation:", e);
  }

  return basePrice + upsellTotal;
}

/**
 * Compute available payment actions for a visit.
 * Returns object with boolean flags for UI.
 */
export function getVisitPaymentActions(visit: MaintenanceVisit | null | undefined): {
  canSendPayLink: boolean;
  canRefund: boolean;
  canRetryPayment: boolean;
} {
  if (!visit) {
    return {
      canSendPayLink: false,
      canRefund: false,
      canRetryPayment: false,
    };
  }

  const paymentStatus = visit.payment_status || "unpaid";

  return {
    canSendPayLink: paymentStatus === "unpaid",
    canRefund: paymentStatus === "paid",
    canRetryPayment: false,
  };
}

// ---------------------------------------------------------------------------
// Async helpers (use db)
// ---------------------------------------------------------------------------

/**
 * Validate that a visit exists.
 * Simplified from the original since we only have one company.
 */
export async function validateVisitAccess(
  visitId: string
): Promise<MaintenanceVisit> {
  const visit = await db.MaintenanceVisit.get(visitId);
  if (!visit) {
    throw new Error("Access denied: Visit not found");
  }
  return visit;
}

/**
 * Validate that a contact exists.
 */
export async function validateContactAccess(
  contactId: string
): Promise<ReturnType<typeof db.Contact.get> extends Promise<infer R> ? NonNullable<R> : never> {
  const contact = await db.Contact.get(contactId);
  if (!contact) {
    throw new Error("Access denied: Contact not found");
  }
  return contact;
}

/**
 * Create a payment with validation.
 * Simplified -- no multi-tenant company checks needed.
 */
export async function createPaymentSafe(
  paymentData: Partial<Payment>
): Promise<Payment> {
  // Validate visit exists if provided
  if (paymentData.maintenance_visit_id) {
    await validateVisitAccess(paymentData.maintenance_visit_id);
  }

  // Validate contact exists if provided
  if (paymentData.contact_id) {
    await validateContactAccess(paymentData.contact_id);
  }

  // Generate idempotency key if not provided
  if (!paymentData.idempotency_key) {
    paymentData.idempotency_key = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  return await db.Payment.create(paymentData);
}

/**
 * List all payments, optionally filtered.
 */
export async function listPayments(
  filters: Partial<Payment> = {}
): Promise<Payment[]> {
  return await db.Payment.filter(filters);
}

/**
 * Get payments for a specific visit.
 */
export async function getVisitPayments(
  visitId: string
): Promise<Payment[]> {
  await validateVisitAccess(visitId);
  return await db.Payment.filter({ maintenance_visit_id: visitId } as Partial<Payment>);
}

/**
 * Get payments for a specific contact.
 */
export async function getContactPayments(
  contactId: string
): Promise<Payment[]> {
  await validateContactAccess(contactId);
  return await db.Payment.filter({ contact_id: contactId });
}

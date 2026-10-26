"use server";

import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { requireStaff } from "@/lib/auth/session";
import type { FormState } from "@/components/admin/forms";

/** A private note on a customer (sizes they wear, preferences); customers never see it. */
export async function addCustomerNote(customerId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff("customers.manage");
  const body = String(formData.get("note") ?? "").trim();
  if (body.length < 2 || body.length > 1000) return { status: "error", message: "Write a note of 2 to 1,000 characters." };
  const customer = await prisma.customer.findFirst({ where: { id: customerId, storeId: DEFAULT_STORE_ID }, select: { id: true } });
  if (!customer) return { status: "error", message: "This customer no longer exists." };
  await prisma.customerNote.create({ data: { storeId: DEFAULT_STORE_ID, customerId, staffId: user.id, body } });
  return { status: "saved", message: "Note added." };
}

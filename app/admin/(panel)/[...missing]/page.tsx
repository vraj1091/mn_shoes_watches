import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";

// Unknown /admin addresses get the admin's own 404 inside the frame instead of the shop's.
export default async function AdminMissingPage() {
  await requireStaff();
  notFound();
}

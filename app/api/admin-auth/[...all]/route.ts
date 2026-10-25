import { toNextJsHandler } from "better-auth/next-js";
import { getStaffAuth } from "@/lib/auth/staff";

export function GET(request: Request) {
  return toNextJsHandler(getStaffAuth()).GET(request);
}

export function POST(request: Request) {
  return toNextJsHandler(getStaffAuth()).POST(request);
}

import { toNextJsHandler } from "better-auth/next-js";
import { getCustomerAuth } from "@/lib/auth/customer";

export function GET(request: Request) {
  return toNextJsHandler(getCustomerAuth()).GET(request);
}

export function POST(request: Request) {
  return toNextJsHandler(getCustomerAuth()).POST(request);
}

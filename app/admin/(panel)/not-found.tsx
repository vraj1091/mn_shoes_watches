import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

/** Inside the admin frame: a record that was deleted, or an admin address that does not exist. */
export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10">
      <p className="text-sm tracking-[0.14em] text-muted uppercase">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight lg:text-3xl">This page is not in the admin</h1>
      <p className="mt-3 text-base text-muted">
        The record may have been deleted, or the address is mistyped. The Activity page shows who deleted what, if you are the owner.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin" className={buttonClasses("primary", "md")}>
          Go to the dashboard
        </Link>
        <Link href="/admin/orders" className={buttonClasses("secondary", "md")}>
          Orders
        </Link>
        <Link href="/admin/products" className={buttonClasses("secondary", "md")}>
          Products
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";

export function ClientBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} replace className="back-link">
      <span aria-hidden="true" className="rtl:rotate-180">←</span>
      {label}
    </Link>
  );
}

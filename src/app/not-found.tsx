import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-32 text-center">
      <p className="font-display text-7xl font-bold tracking-tight text-paper">
        404<span className="text-accent">.</span>
      </p>
      <p className="mt-4 font-mono text-sm text-muted">No rows returned for this route.</p>
      <Link href="/" className="btn btn-ghost press mt-9">
        Back to home
      </Link>
    </div>
  );
}

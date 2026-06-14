import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b border-black/10 px-6 py-3 dark:border-white/15">
      <Link href="/" className="text-lg font-bold tracking-tight">
        Go Fast Boat
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        <Show when="signed-out">
          <SignInButton mode="modal" />
          <SignUpButton mode="modal" />
        </Show>
        <Show when="signed-in">
          <Link href="/admin" className="font-medium hover:underline">
            Admin
          </Link>
          <UserButton />
        </Show>
      </nav>
    </header>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getObservedAtLabel } from "@/lib/availability/read-model";
import { PageFrame } from "../_components/page-frame";
import { SectionHeader } from "../_components/section-header";
import { LoginForm } from "./_components/login-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Magic link sign-in for Hetzner Cloud Radar Market.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  const { next } = await searchParams;
  const nextPath =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/market";

  if (session) {
    redirect(nextPath);
  }

  return (
    <PageFrame observedAt={await getObservedAtLabel()}>
      <section className="flex flex-col gap-6 pt-10">
        <SectionHeader
          as="h1"
          kicker="Market"
          title="Sign in"
          blurb="Email a magic link. No password. Used to list servers and see seller contact."
        />
        <LoginForm nextPath={nextPath} />
      </section>
    </PageFrame>
  );
}

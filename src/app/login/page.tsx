import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth0LoginHref, isAuthEnabled, safeReturnTo } from "@/lib/auth/config";
import { getAuthUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Log in | OBLIQ" };

type LoginProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginProps) {
  const { returnTo } = await searchParams;
  const target = safeReturnTo(typeof returnTo === "string" ? returnTo : null);
  if (!isAuthEnabled() || (await getAuthUser())) redirect(target);

  // Plain links, not <Link>: /auth/* are server redirects to Auth0.
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <Image
          className="brand-logo"
          src="/obliq-logo-light.svg"
          alt="OBLIQ"
          width={77}
          height={34}
          priority
        />
        <h1 id="login-title">Log in to OBLIQ</h1>
        <p>Use your work email to open your firm&apos;s workspace.</p>
        <div className="login-actions">
          <a className="primary-button" href={auth0LoginHref(target)}>
            Log in
          </a>
          <a className="secondary-button" href={auth0LoginHref(target, true)}>
            Create an account
          </a>
        </div>
      </section>
    </main>
  );
}

import { OfferAccountPage } from "../../../components/offer-account-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; password?: string }> }) {
  const { next, password } = await searchParams;
  return <OfferAccountPage mode="sign-in" next={next} passwordUpdated={password === "updated"} />;
}

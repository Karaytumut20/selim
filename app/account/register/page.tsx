import { OfferAccountPage } from "../../../components/offer-account-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create an account", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <OfferAccountPage mode="register" next={(await searchParams).next} />;
}

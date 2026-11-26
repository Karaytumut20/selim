"use client";

import { useActionState } from "react";
import { registerForOffers, signInForOffers } from "../app/account/actions";

export function OfferAccountForm({ mode, next }: { mode: "sign-in" | "register"; next: string }) {
  const register = mode === "register";
  const [result, submit, pending] = useActionState(register ? registerForOffers : signInForOffers, {});
  return <form className="offer-form" action={submit}>
    <input type="hidden" name="next" value={next} />
    <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
    <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"}
      minLength={register ? 8 : undefined} maxLength={128} required /></label>
    {register && <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>}
    {result.error && <p className="offer-error" role="alert">{result.error}</p>}
    {result.notice && <p role="status">{result.notice}</p>}
    <button className="button button-primary" disabled={pending}>{pending ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
  </form>;
}

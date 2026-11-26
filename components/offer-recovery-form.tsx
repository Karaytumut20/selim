"use client";

import { useActionState } from "react";
import { requestOfferPasswordReset, updateOfferPassword } from "../app/account/actions";

export function OfferRecoveryForm({ reset = false }: { reset?: boolean }) {
  const [result, submit, pending] = useActionState(reset ? updateOfferPassword : requestOfferPasswordReset, {});
  return <form className="offer-form" action={submit}>
    {reset ? <>
      <label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
      <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
    </> : <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>}
    {result.error && <p className="offer-error" role="alert">{result.error}</p>}
    {result.notice && <p role="status">{result.notice}</p>}
    <button className="button button-primary" disabled={pending}>{pending ? "Please wait…" : reset ? "Update password" : "Send reset link"}</button>
  </form>;
}

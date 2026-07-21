"use client";

import { FormEvent, useState } from "react";
import { FileImage, MessageCircle, Paperclip, X } from "lucide-react";
import { buildWhatsAppUrl } from "../lib/whatsapp";
import { siteConfig } from "../lib/site-config";

type Errors = Record<string, string>;

export function RepairForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const required = ["fullName", "phone", "email", "productName", "faultSymptoms"];
    const nextErrors: Errors = {};
    for (const key of required) if (!String(form.get(key) || "").trim()) nextErrors[key] = "This field is required.";
    const email = String(form.get("email") || "");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = event.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(nextErrors)[0]}"]`);
      first?.focus();
      return;
    }
    const value = (key: string) => String(form.get(key) || "Not provided").trim() || "Not provided";
    const message = `Hello ${siteConfig.name},\n\nI would like to request a repair evaluation.\n\nContact\nName: ${value("fullName")}\nCompany: ${value("company")}\nPhone: ${value("phone")}\nEmail: ${value("email")}\n\nEquipment\nProduct / Board: ${value("productName")}\nPart Number: ${value("partNumber")}\nMachine / System: ${value("machine")}\nPrevious Repair: ${value("previousRepair")}\nUrgency: ${value("urgency")}\n\nFault Details\nSymptoms: ${value("faultSymptoms")}\nError Code: ${value("errorCode")}\nNotes: ${value("notes")}\n\nPhotos / Documents Selected: ${files.length ? files.map((file) => file.name).join(", ") : "None"}\n${files.length ? "I understand I need to attach these files manually in WhatsApp after it opens." : ""}\n\nPlease let me know the next steps for evaluation and shipping.`;
    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  }

  return (
    <form className="repair-form" onSubmit={submit} noValidate>
      <div className="form-section-head"><span>01</span><div><h2>Contact details</h2><p>Used only to respond to this repair inquiry.</p></div></div>
      <div className="form-grid">
        <Field label="Full name" name="fullName" required error={errors.fullName} />
        <Field label="Company" name="company" />
        <Field label="Phone" name="phone" required type="tel" error={errors.phone} />
        <Field label="Email" name="email" required type="email" error={errors.email} />
      </div>
      <div className="form-section-head"><span>02</span><div><h2>Board identification</h2><p>Part number not known? Add the machine or system and send label photos.</p></div></div>
      <div className="form-grid">
        <Field label="Product / board name" name="productName" required error={errors.productName} />
        <Field label="Part number" name="partNumber" />
        <Field label="Machine or system" name="machine" full />
      </div>
      <div className="form-section-head"><span>03</span><div><h2>Fault details</h2><p>Describe when the issue occurs and any events that preceded it.</p></div></div>
      <div className="form-grid">
        <Field label="Fault symptoms" name="faultSymptoms" required error={errors.faultSymptoms} full textarea />
        <Field label="Error code" name="errorCode" />
        <label className="field"><span>Has the board been repaired before?</span><select name="previousRepair" defaultValue="Unknown"><option>Unknown</option><option>No</option><option>Yes</option></select></label>
        <label className="field"><span>Urgency</span><select name="urgency" defaultValue="Standard evaluation"><option>Standard evaluation</option><option>Production is stopped</option><option>Intermittent production impact</option><option>Planning / spare unit</option></select></label>
        <Field label="Optional notes" name="notes" full textarea />
      </div>
      <div className="form-section-head"><span>04</span><div><h2>Photos and documents</h2><p>Files remain on your device. Attach them manually after WhatsApp opens.</p></div></div>
      <label className="file-drop"><FileImage /><strong>Select board photos or documents</strong><span>Images and PDFs · no files are uploaded by this website</span><input type="file" multiple accept="image/*,.pdf" onChange={(event) => setFiles(Array.from(event.target.files || []))} /></label>
      {files.length > 0 && <div className="file-list">{files.map((file, index) => <div key={`${file.name}-${index}`}><Paperclip /><span>{file.name}</span><small>{Math.ceil(file.size / 1024)} KB</small><button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`}><X /></button></div>)}</div>}
      <div className="form-submit"><p><strong>No data is submitted to this website.</strong> Your entries are formatted into a WhatsApp message. Selected files must be attached manually in WhatsApp.</p><button className="button button-primary" type="submit"><MessageCircle /> Continue to WhatsApp</button></div>
    </form>
  );
}

function Field({ label, name, required, error, type = "text", full = false, textarea = false }: { label: string; name: string; required?: boolean; error?: string; type?: string; full?: boolean; textarea?: boolean }) {
  const inputId = `field-${name}`;
  return <label className={`field ${full ? "field-full" : ""}`} htmlFor={inputId}><span>{label}{required && <em>Required</em>}</span>{textarea ? <textarea id={inputId} name={name} rows={4} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} /> : <input id={inputId} name={name} type={type} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} />}{error && <small className="field-error" id={`${inputId}-error`}>{error}</small>}</label>;
}


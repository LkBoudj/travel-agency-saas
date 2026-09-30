import { useState } from "react";

import type { BookingCtaProps } from "../sdk.ts";
import "./islands.css";

/**
 * Booking call-to-action. The island holds only the acknowledged state; the
 * actual enquiry is the agency's own endpoint reached from `successMessage`
 * copy, so no payment or booking is simulated here.
 */
export default function BookingCta(props: BookingCtaProps) {
  const {
    title,
    description,
    ctaLabel,
    successMessage,
    note,
    disabled = false,
  } = props;

  const [requested, setRequested] = useState(false);

  return (
    <div className="island-cta" data-island="booking-cta">
      <h3 className="island-cta-title">{title}</h3>
      {description ? (
        <p className="island-cta-description">{description}</p>
      ) : null}
      <button
        type="button"
        className="island-button"
        disabled={disabled || requested}
        onClick={() => setRequested(true)}
      >
        {ctaLabel}
      </button>
      <p className="island-status" role="status" aria-live="polite">
        {requested ? successMessage : (note ?? "")}
      </p>
    </div>
  );
}

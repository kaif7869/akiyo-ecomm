"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="contact-success" role="status">
        <h2>Thank you for reaching out.</h2>
        <p>We have received your message and will get back to you shortly.</p>
        <button type="button" onClick={() => setSubmitted(false)}>Send another message</button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="contact-form-row">
        <label>Name<input name="name" type="text" autoComplete="name" required placeholder="Name" /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required placeholder="Email" /></label>
      </div>
      <label>Phone<input name="phone" type="tel" autoComplete="tel" placeholder="Phone" /></label>
      <label>Comment<textarea name="comment" required minLength={10} rows={8} placeholder="Comment" /></label>
      <button className="contact-submit" type="submit">Submit</button>
    </form>
  );
}

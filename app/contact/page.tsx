import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact | Akiyo",
  description: "Get in touch with the Akiyo team.",
};

export default function ContactPage() {
  return (
    <main className="contact-page">
      <SiteHeader activePage="contact" variant="solid" />
      <section className="contact-content" aria-labelledby="contact-title">
        <h1 id="contact-title">Contact</h1>
        <ContactForm />
      </section>
    </main>
  );
}

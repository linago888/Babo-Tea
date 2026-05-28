"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import type { Locale } from "@/i18n/routing";

type Status = "idle" | "submitting" | "success" | "error";

export function NewsletterForm({ locale }: { locale: Locale }) {
  const t = useTranslations("home.newsletter");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setMessage(t("successMessage"));
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error ?? t("errorMessage"));
      }
    } catch {
      setStatus("error");
      setMessage(t("errorMessage"));
    }
  }

  return (
    <>
      <form
        className="mx-auto mt-6 flex max-w-md gap-2"
        onSubmit={onSubmit}
        aria-describedby="newsletter-hint"
      >
        <label htmlFor="newsletter-email" className="sr-only">
          {t("placeholder")}
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("placeholder")}
          disabled={status === "submitting" || status === "success"}
          className="flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm transition focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
        />
        <button
          type="submit"
          disabled={status === "submitting" || status === "success" || !email}
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {status === "submitting" ? "..." : t("subscribe")}
        </button>
      </form>
      <p
        id="newsletter-hint"
        className={`mt-3 text-xs ${
          status === "error"
            ? "text-rose-600 dark:text-rose-400"
            : status === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-500 dark:text-neutral-500"
        }`}
      >
        {message || t("soon")}
      </p>
    </>
  );
}

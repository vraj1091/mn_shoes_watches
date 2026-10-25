import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import nodemailer, { type Transporter } from "nodemailer";
import { dataPath } from "@/lib/db/paths";
import { env } from "@/lib/env";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let transporter: Transporter | null | undefined;

function smtpTransport(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = env();
  transporter =
    SMTP_HOST && SMTP_USER && SMTP_PASSWORD
      ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
        })
      : null;
  return transporter;
}

/**
 * Without SMTP settings, development writes each email to DATA_DIR/outbox as an HTML file; the
 * end-to-end tests set EMAIL_TRANSPORT=outbox to read sign-in codes from there. Otherwise
 * production refuses, so a missing SMTP setting shows up as an error instead of emails
 * silently going nowhere.
 */
async function writeToOutbox(email: Email): Promise<void> {
  const dir = dataPath("outbox");
  await mkdir(dir, { recursive: true });
  const safeTo = email.to.replace(/[^a-z0-9@._-]/gi, "_");
  const file = `${dir}/${Date.now()}-${safeTo}.html`;
  await writeFile(file, `<!-- To: ${email.to} | Subject: ${email.subject} -->\n${email.html}`);
  console.info(`[email] ${email.subject} → ${email.to} (saved to ${file})`);
}

export async function sendEmail(email: Email): Promise<void> {
  if (env().EMAIL_TRANSPORT === "outbox") {
    await writeToOutbox(email);
    return;
  }
  const transport = smtpTransport();
  if (!transport) {
    if (env().NODE_ENV === "production") {
      throw new Error("Email is not set up: add SMTP_HOST, SMTP_USER and SMTP_PASSWORD to the environment.");
    }
    await writeToOutbox(email);
    return;
  }
  const from = env().MAIL_FROM ?? env().SMTP_USER;
  await transport.sendMail({ from, to: email.to, subject: email.subject, html: email.html, text: email.text });
}

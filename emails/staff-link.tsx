import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "react-email";
import { resolve } from "@/lib/design/tokens";

/** "invite": the owner added a staff member; "reset": a staff member forgot their password. */
export type StaffLinkPurpose = "invite" | "reset";

type Props = {
  storeName: string;
  purpose: StaffLinkPurpose;
  link: string;
  hoursValid: number;
  /** For an invite: who sent it and the role it gives. */
  invitedBy?: string;
  roleLabel?: string;
};

// Email clients ignore CSS variables, so the light-mode token values are inlined.
const { ink, muted, canvas, primary, "on-primary": onPrimary } = resolve("light");

function copy({ storeName, purpose, invitedBy, roleLabel }: Props) {
  if (purpose === "invite") {
    return {
      subject: `You have been invited to the ${storeName} admin`,
      heading: "Set your password",
      body: `${invitedBy ?? "The owner"} added you to the ${storeName} admin${roleLabel ? ` as ${roleLabel}` : ""}. Choose a password to finish setting up your account.`,
      button: "Set my password",
    };
  }
  return {
    subject: `Set a new password for the ${storeName} admin`,
    heading: "Set a new password",
    body: "Someone asked to reset the password of your staff account. Choose a new one with the button below; you will be signed out everywhere else.",
    button: "Set a new password",
  };
}

export function staffLinkSubject(props: Props): string {
  return copy(props).subject;
}

export function StaffLinkEmail(props: Props) {
  const text = copy(props);
  return (
    <Html lang="en">
      <Head />
      <Preview>{text.subject}</Preview>
      <Body style={{ backgroundColor: canvas, color: ink, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 480, padding: "32px 24px" }}>
          <Text style={{ fontSize: 14, letterSpacing: 1, textTransform: "uppercase", color: muted, margin: 0 }}>{props.storeName} admin</Text>
          <Heading as="h1" style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 26, margin: "16px 0" }}>
            {text.heading}
          </Heading>
          <Text style={{ fontSize: 15, lineHeight: "24px" }}>{text.body}</Text>
          <Button href={props.link} style={{ backgroundColor: primary, color: onPrimary, borderRadius: 4, padding: "12px 20px", fontSize: 15, fontWeight: 600 }}>
            {text.button}
          </Button>
          <Text style={{ fontSize: 13, lineHeight: "20px", color: muted }}>
            The link works for {props.hoursValid} {props.hoursValid === 1 ? "hour" : "hours"} and only once. If the button does not work, copy this address into your
            browser: {props.link}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: "20px", color: muted }}>If you were not expecting this email, ignore it. Nothing changes without the link.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function staffLinkText(props: Props): string {
  const text = copy(props);
  return `${text.body}\n\n${text.button}: ${props.link}\n\nThe link works for ${props.hoursValid} ${props.hoursValid === 1 ? "hour" : "hours"} and only once. If you were not expecting this email, ignore it.`;
}

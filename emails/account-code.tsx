import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "react-email";
import { resolve } from "@/lib/design/tokens";

/** What the code is for; the wording of the email follows it. */
export type CodePurpose = "sign-in" | "sign-up" | "reset" | "verify";

type Props = {
  storeName: string;
  code: string;
  minutesValid: number;
  purpose: CodePurpose;
};

// Email clients ignore CSS variables, so the light-mode token values are inlined.
const { ink: ink900, muted: ink500, surface: ink100, canvas: ink50 } = resolve("light");

const COPY: Record<CodePurpose, { heading: string; body: string; subject: string }> = {
  "sign-in": {
    subject: "is your sign-in code",
    heading: "Your code to sign in",
    body: "Enter this code on the sign-in page.",
  },
  "sign-up": {
    subject: "is your code to finish creating your account",
    heading: "Confirm your email",
    body: "Enter this code on the page where you are creating your account. Your account is saved once the code is checked.",
  },
  reset: {
    subject: "is your code to set a new password",
    heading: "Set a new password",
    body: "Enter this code on the password page, together with your new password.",
  },
  verify: {
    subject: "is your code to confirm your email",
    heading: "Confirm your email",
    body: "Enter this code where you were asked for it.",
  },
};

export function accountCodeSubject({ storeName, code, purpose }: Pick<Props, "storeName" | "code" | "purpose">): string {
  return `${code} ${COPY[purpose].subject} at ${storeName}`;
}

export function AccountCodeEmail({ storeName, code, minutesValid, purpose }: Props) {
  const copy = COPY[purpose];
  return (
    <Html lang="en">
      <Head />
      <Preview>{accountCodeSubject({ storeName, code, purpose })}</Preview>
      <Body style={{ backgroundColor: ink50, color: ink900, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 480, padding: "32px 24px" }}>
          <Text style={{ fontSize: 14, letterSpacing: 1, textTransform: "uppercase", color: ink500, margin: 0 }}>
            {storeName}
          </Text>
          <Heading as="h1" style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 26, margin: "16px 0" }}>
            {copy.heading}
          </Heading>
          <Section style={{ backgroundColor: ink100, borderRadius: 4, padding: "20px 0", textAlign: "center" }}>
            <Text style={{ fontSize: 32, letterSpacing: 8, fontWeight: 700, margin: 0 }}>{code}</Text>
          </Section>
          <Text style={{ fontSize: 15, lineHeight: "24px" }}>
            {copy.body} It works for {minutesValid} minutes and only once.
          </Text>
          <Text style={{ fontSize: 13, lineHeight: "20px", color: ink500 }}>
            If you did not ask for this code, you can ignore this email. Nothing changes without it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function accountCodeText({ storeName, code, minutesValid, purpose }: Props): string {
  return `${accountCodeSubject({ storeName, code, purpose })}. ${COPY[purpose].body} It works for ${minutesValid} minutes and only once. If you did not ask for it, ignore this email.`;
}

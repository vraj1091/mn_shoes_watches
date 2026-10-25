import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "react-email";

type Props = {
  storeName: string;
  code: string;
  minutesValid: number;
  purpose: "customer" | "verify";
};

// Email clients ignore CSS variables, so the palette values are written out here.
const ink900 = "#1F1A17";
const ink500 = "#7A706A";
const ink100 = "#F1EDE7";
const ink50 = "#F8F6F2";

export function SignInCodeEmail({ storeName, code, minutesValid, purpose }: Props) {
  const action = purpose === "customer" ? "sign in" : "confirm your email";
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {code} is your {storeName} code
      </Preview>
      <Body style={{ backgroundColor: ink50, color: ink900, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 480, padding: "32px 24px" }}>
          <Text style={{ fontSize: 14, letterSpacing: 1, textTransform: "uppercase", color: ink500, margin: 0 }}>
            {storeName}
          </Text>
          <Heading as="h1" style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 26, margin: "16px 0" }}>
            Your code to {action}
          </Heading>
          <Section style={{ backgroundColor: ink100, borderRadius: 8, padding: "20px 0", textAlign: "center" }}>
            <Text style={{ fontSize: 32, letterSpacing: 8, fontWeight: 700, margin: 0 }}>{code}</Text>
          </Section>
          <Text style={{ fontSize: 15, lineHeight: "24px" }}>
            Enter this code on the {storeName} website. It works for {minutesValid} minutes and only once.
          </Text>
          <Text style={{ fontSize: 13, lineHeight: "20px", color: ink500 }}>
            If you did not ask for this code, you can ignore this email. Nobody can sign in without it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function signInCodeText({ storeName, code, minutesValid }: Props): string {
  return `${code} is your ${storeName} code. It works for ${minutesValid} minutes and only once. If you did not ask for it, ignore this email.`;
}

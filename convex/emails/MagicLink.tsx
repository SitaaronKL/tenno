import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export type MagicLinkProps = { url: string };

export function MagicLink({ url }: MagicLinkProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Tenno sign in link</Preview>
      <Body style={{ backgroundColor: "#0b0b0f", fontFamily: "system-ui" }}>
        <Container style={{ padding: "24px" }}>
          <Heading as="h1" style={{ color: "#fafafa", fontSize: "20px" }}>
            Sign in to Tenno
          </Heading>
          <Text style={{ color: "#a1a1aa" }}>
            This link works once and expires in 15 minutes.
          </Text>
          <Button href={url} style={{ color: "#0b0b0f", backgroundColor: "#7dd3fc", padding: "10px 16px" }}>
            Sign in
          </Button>
          <Text style={{ color: "#a1a1aa" }}>
            If you did not ask for this, ignore the email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLink;

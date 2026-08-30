import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type RuleMatchProps = {
  ruleName: string;
  kind: string;
  title: string;
  detail?: string;
  expiresAt?: string;
  url: string;
};

export function RuleMatch({
  ruleName,
  kind,
  title,
  detail,
  expiresAt,
  url,
}: RuleMatchProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${ruleName}: ${title}`}</Preview>
      <Body style={{ backgroundColor: "#0b0b0f", fontFamily: "system-ui" }}>
        <Container style={{ padding: "24px" }}>
          <Heading as="h1" style={{ color: "#fafafa", fontSize: "20px" }}>
            {title}
          </Heading>
          <Section>
            <Text style={{ color: "#a1a1aa" }}>
              Your rule {ruleName} matched a {kind} in Warframe.
            </Text>
            {detail ? <Text style={{ color: "#a1a1aa" }}>{detail}</Text> : null}
            {expiresAt ? (
              <Text style={{ color: "#a1a1aa" }}>Expires {expiresAt}</Text>
            ) : null}
            <Link href={url} style={{ color: "#fafafa", textDecoration: "underline" }}>
              Open Voidwatch
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default RuleMatch;

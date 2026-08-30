import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Row,
  Text,
} from "@react-email/components";

export type DigestItem = { ruleName: string; title: string; detail?: string };

export type DigestProps = { items: DigestItem[]; url: string };

export function Digest({ items, url }: DigestProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${items.length} Warframe alerts`}</Preview>
      <Body style={{ backgroundColor: "#0b0b0f", fontFamily: "system-ui" }}>
        <Container style={{ padding: "24px" }}>
          <Heading as="h1" style={{ color: "#fafafa", fontSize: "20px" }}>
            Your Warframe digest
          </Heading>
          <Text style={{ color: "#a1a1aa" }}>
            {items.length} alerts matched your rules since your last digest.
          </Text>
          {items.map((item, i) => (
            <Row key={i}>
              <Text style={{ color: "#fafafa" }}>
                {item.title} ({item.ruleName})
              </Text>
              {item.detail ? (
                <Text style={{ color: "#a1a1aa" }}>{item.detail}</Text>
              ) : null}
            </Row>
          ))}
          <Link href={url} style={{ color: "#fafafa", textDecoration: "underline" }}>
            Open Voidwatch
          </Link>
        </Container>
      </Body>
    </Html>
  );
}

export default Digest;

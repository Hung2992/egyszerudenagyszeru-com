/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Bejelentkezési link – {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bejelentkezési link</Heading>
        <Text style={text}>
          Kattints az alábbi gombra a bejelentkezéshez ({siteName}). A link
          hamarosan lejár.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Bejelentkezés
        </Button>
        <Text style={footer}>
          Ha nem te kérted ezt a linket, nyugodtan figyelmen kívül hagyhatod
          ezt az üzenetet.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '0px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Jelszó visszaállítás – {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Jelszó visszaállítása</Heading>
        <Text style={text}>
          Kaptunk egy kérést a jelszavad visszaállítására a {siteName} oldalon.
          Kattints az alábbi gombra az új jelszó megadásához.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Jelszó visszaállítása
        </Button>
        <Text style={footer}>
          Ha nem te kérted a jelszó visszaállítást, nyugodtan figyelmen kívül
          hagyhatod ezt az üzenetet. A jelszavad nem fog megváltozni.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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

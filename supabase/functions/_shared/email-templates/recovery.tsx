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
    <Preview>Jelszó visszaállítása — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Jelszó visszaállítása 🔐</Heading>
        <Text style={text}>
          Jelszó-visszaállítási kérelmet kaptunk a {siteName} fiókodhoz. Kattints
          az alábbi gombra, hogy új jelszót adhass meg.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Új jelszó beállítása
        </Button>
        <Text style={footer}>
          Ha nem te kérted a jelszó-visszaállítást, hagyd figyelmen kívül ezt
          az e-mailt — a jelszavad nem fog megváltozni.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Space Grotesk, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#050505', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 20px' }
const button = {
  backgroundColor: '#e6a817',
  color: '#050505',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '0px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 24px',
}
const footer = { fontSize: '12px', color: '#71717a', margin: '32px 0 0', borderTop: '1px solid #e4e4e7', paddingTop: '20px' }

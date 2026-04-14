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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>E-mail cím módosítás megerősítése – {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>E-mail cím módosítása</Heading>
        <Text style={text}>
          Kérést kaptunk az e-mail címed módosítására ({email} → {newEmail}) a{' '}
          {siteName} oldalon. Kattints az alábbi gombra a módosítás
          megerősítéséhez.
        </Text>
        <Button style={button} href={confirmationUrl}>
          E-mail módosítás megerősítése
        </Button>
        <Text style={footer}>
          Ha nem te kérted ezt a módosítást, kérjük, változtasd meg a jelszavad
          azonnal.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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

/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
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
    <Preview>E-mail cím módosítás megerősítése — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>E-mail cím módosítás megerősítése 📧</Heading>
        <Text style={text}>
          Az e-mail címed módosítását kérted a {siteName} fiókodhoz erről:{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          erre:{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          Kattints az alábbi gombra a módosítás megerősítéséhez:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Módosítás megerősítése
        </Button>
        <Text style={footer}>
          Ha nem te kérted ezt a módosítást, azonnal védd meg a fiókodat.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Space Grotesk, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#050505', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#e6a817', textDecoration: 'underline' }
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

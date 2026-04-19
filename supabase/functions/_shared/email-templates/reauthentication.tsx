/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Ellenőrző kódod</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Ellenőrző kód 🔢</Heading>
        <Text style={text}>Az alábbi kóddal erősítsd meg a személyazonosságodat:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ez a kód rövid időn belül lejár. Ha nem te kérted, nyugodtan hagyd
          figyelmen kívül ezt az e-mailt.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Space Grotesk, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#050505', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#e6a817',
  letterSpacing: '6px',
  margin: '0 0 32px',
  padding: '20px',
  backgroundColor: '#fafafa',
  border: '2px solid #e6a817',
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#71717a', margin: '32px 0 0', borderTop: '1px solid #e4e4e7', paddingTop: '20px' }

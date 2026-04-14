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
    <Preview>Ellenőrző kód</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Személyazonosság megerősítése</Heading>
        <Text style={text}>Használd az alábbi kódot a személyazonosságod megerősítéséhez:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          A kód hamarosan lejár. Ha nem te kérted, nyugodtan figyelmen kívül
          hagyhatod ezt az üzenetet.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

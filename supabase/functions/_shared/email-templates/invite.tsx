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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Meghívót kaptál — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Meghívót kaptál 👑</Heading>
        <Text style={text}>
          Meghívást kaptál, hogy csatlakozz a{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>{' '}
          közösséghez. Kattints az alábbi gombra a meghívó elfogadásához és a
          fiókod létrehozásához.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Meghívó elfogadása
        </Button>
        <Text style={footer}>
          Ha nem vártál meghívót, nyugodtan hagyd figyelmen kívül ezt az e-mailt.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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

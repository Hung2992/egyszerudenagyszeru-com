/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszer de Nagyszeru"

const GiveawayThanksEmail = () => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Köszönjük a részvételt a {SITE_NAME} nyereményjátékán!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Köszönjük a részvételt! 🎲
        </Heading>
        <Text style={text}>
          Részt vettél a {SITE_NAME} nyereményjátékán. Sajnos most nem nyertél, de köszönjük, hogy játszottál velünk!
        </Text>
        <Text style={text}>
          Nézd meg a termékeinket kedvezményes áron — hátha találsz valamit, ami tetszik!
        </Text>
        <Button href="https://egyszerudenagyszeru.com/shop" style={button}>
          NÉZD MEG A TERMÉKEINKET
        </Button>
        <Text style={footer}>Üdvözlettel, a {SITE_NAME} csapata</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GiveawayThanksEmail,
  subject: 'Köszönjük a részvételt a nyereményjátékunkon!',
  displayName: 'Nyereményjáték részvétel értesítő',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif", textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const button = { backgroundColor: '#000000', color: '#ffffff', padding: '14px 28px', fontSize: '12px', fontWeight: 'bold' as const, letterSpacing: '0.1em', textDecoration: 'none', display: 'inline-block' as const, borderRadius: '0px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

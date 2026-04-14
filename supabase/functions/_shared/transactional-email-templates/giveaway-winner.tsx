/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszer de Nagyszeru"

const GiveawayWinnerEmail = () => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>🎉 Gratulálunk! Nyertél a {SITE_NAME} nyereményjátékán!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          🎉 GRATULÁLUNK, NYERTÉL! 🎉
        </Heading>
        <Text style={text}>
          Részt vettél a {SITE_NAME} nyereményjátékán és <strong>NYERTÉL</strong>! Minden termékünkből 1 darabot kapsz teljesen ingyen!
        </Text>
        <Text style={text}>
          Hamarosan felvesszük veled a kapcsolatot a szállítási adatokkal kapcsolatban. Addig is nézd meg a teljes kínálatunkat!
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
  component: GiveawayWinnerEmail,
  subject: '🎉 Gratulálunk! Nyertél a nyereményjátékunkon!',
  displayName: 'Nyereményjáték nyertes értesítő',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif", textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const button = { backgroundColor: '#000000', color: '#ffffff', padding: '14px 28px', fontSize: '12px', fontWeight: 'bold' as const, letterSpacing: '0.1em', textDecoration: 'none', display: 'inline-block' as const, borderRadius: '0px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

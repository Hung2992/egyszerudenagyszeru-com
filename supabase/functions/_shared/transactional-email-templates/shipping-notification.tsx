/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszer de Nagyszeru"

interface ShippingNotificationProps {
  name?: string
  trackingUrl?: string
  trackingNumber?: string
}

const ShippingNotificationEmail = ({ name, trackingUrl, trackingNumber }: ShippingNotificationProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Csomagod úton van! 📦 - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `${name}, a` : 'A'} csomagod úton van! 📦
        </Heading>
        <Text style={text}>
          Feladtuk a csomagodat! Hamarosan megérkezik hozzád.
        </Text>
        {trackingNumber && (
          <Text style={text}>
            <strong>Nyomkövetési szám:</strong> {trackingNumber}
          </Text>
        )}
        {trackingUrl && (
          <Button href={trackingUrl} style={button}>
            CSOMAG KÖVETÉSE
          </Button>
        )}
        <Text style={text}>
          Ha bármilyen kérdésed van a szállítással kapcsolatban, keress minket bátran.
        </Text>
        <Text style={footer}>Üdvözlettel, {SITE_NAME} csapata</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ShippingNotificationEmail,
  subject: 'Csomagod úton van! 📦',
  displayName: 'Szállítási értesítés',
  previewData: { name: 'Márk', trackingNumber: 'GLS-123456789', trackingUrl: 'https://gls-group.eu/track/123456789' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const button = { backgroundColor: '#000000', color: '#ffffff', padding: '14px 28px', fontSize: '12px', fontWeight: 'bold' as const, letterSpacing: '0.1em', textDecoration: 'none', display: 'inline-block' as const, borderRadius: '0px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

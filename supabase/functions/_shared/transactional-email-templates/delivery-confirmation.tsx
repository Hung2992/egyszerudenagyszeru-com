/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszerű de Nagyszerű"

interface DeliveryConfirmationProps {
  name?: string
}

const DeliveryConfirmationEmail = ({ name }: DeliveryConfirmationProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Csomagod kézbesítve! ✅ - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `${name}, a` : 'A'} csomagod megérkezett! ✅
        </Heading>
        <Text style={text}>
          A csomagod sikeresen kézbesítésre került. Reméljük, hogy elégedett vagy a rendeléseddel!
        </Text>
        <Hr style={hr} />
        <Text style={text}>
          Ha bármilyen problémád van a termékkel, kérjük vedd fel velünk a kapcsolatot a weboldalunkon.
        </Text>
        <Text style={footer}>Üdvözlettel, {SITE_NAME} csapata</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DeliveryConfirmationEmail,
  subject: 'Csomagod kézbesítve! ✅',
  displayName: 'Kézbesítési visszaigazolás',
  previewData: { name: 'Márk' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

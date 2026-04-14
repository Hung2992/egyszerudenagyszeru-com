/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszer de Nagyszeru"

interface OrderConfirmationProps {
  name?: string
  totalAmount?: string
  itemCount?: number
}

const OrderConfirmationEmail = ({ name, totalAmount, itemCount }: OrderConfirmationProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Rendelésed megérkezett - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Köszönjük a rendelésed{name ? `, ${name}` : ''}! 🛍️
        </Heading>
        <Text style={text}>
          Sikeresen megkaptuk a rendelésedet{itemCount ? ` (${itemCount} termék)` : ''}{totalAmount ? ` összesen ${totalAmount} Ft értékben` : ''}.
        </Text>
        <Hr style={hr} />
        <Text style={text}>
          Rendelésedet hamarosan feldolgozzuk és értesítünk, amikor feladtuk a csomagot.
        </Text>
        <Text style={text}>
          Ha bármilyen kérdésed van a rendeléseddel kapcsolatban, írj nekünk a kapcsolati oldalon.
        </Text>
        <Text style={footer}>Üdvözlettel, {SITE_NAME} csapata</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: 'Rendelésed visszaigazolása',
  displayName: 'Rendelés visszaigazolás',
  previewData: { name: 'Márk', totalAmount: '14 990', itemCount: 2 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

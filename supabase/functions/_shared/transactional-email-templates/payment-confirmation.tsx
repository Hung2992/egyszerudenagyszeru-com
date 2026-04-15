/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszerű de Nagyszerű"

interface PaymentConfirmationProps {
  name?: string
  totalAmount?: string
  paymentMethod?: string
}

const PaymentConfirmationEmail = ({ name, totalAmount, paymentMethod }: PaymentConfirmationProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Fizetésed visszaigazolva! 💳 - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Fizetés visszaigazolva{name ? `, ${name}` : ''}! 💳
        </Heading>
        <Text style={text}>
          Sikeresen megkaptuk a fizetésedet{totalAmount ? ` ${totalAmount} Ft összegben` : ''}.
        </Text>
        {paymentMethod && (
          <Text style={text}>
            <strong>Fizetési mód:</strong> {paymentMethod}
          </Text>
        )}
        <Hr style={hr} />
        <Text style={text}>
          Rendelésedet hamarosan feldolgozzuk. Ha bármilyen kérdésed van, keresd ügyfélszolgálatunkat.
        </Text>
        <Text style={footer}>Üdvözlettel, {SITE_NAME} csapata</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentConfirmationEmail,
  subject: 'Fizetésed visszaigazolva! 💳',
  displayName: 'Fizetés visszaigazolás',
  previewData: { name: 'Márk', totalAmount: '14 990', paymentMethod: 'Bankkártya' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

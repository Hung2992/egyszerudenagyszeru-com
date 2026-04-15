/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszerű de Nagyszerű"

interface CouponNotificationProps {
  name?: string
  couponCode?: string
  discountText?: string
}

const CouponNotificationEmail = ({ name, couponCode, discountText }: CouponNotificationProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Kuponkódod megérkezett! 🎁 - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `${name}, itt` : 'Itt'} a kuponkódod! 🎁
        </Heading>
        {couponCode && (
          <Text style={couponStyle}>
            {couponCode}
          </Text>
        )}
        {discountText && (
          <Text style={text}>
            Kedvezmény: <strong>{discountText}</strong>
          </Text>
        )}
        <Hr style={hr} />
        <Text style={text}>
          Használd fel a kuponkódot a pénztárnál a következő rendelésednél!
        </Text>
        <Text style={footer}>Üdvözlettel, {SITE_NAME} csapata</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CouponNotificationEmail,
  subject: 'Kuponkódod megérkezett! 🎁',
  displayName: 'Kupon értesítés',
  previewData: { name: 'Márk', couponCode: 'KEDVEZMENY20', discountText: '20% kedvezmény' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const couponStyle = { fontSize: '28px', fontWeight: 'bold' as const, color: '#000000', textAlign: 'center' as const, letterSpacing: '0.15em', padding: '20px', backgroundColor: '#f5f5f5', margin: '0 0 20px', fontFamily: "'Space Grotesk', monospace" }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

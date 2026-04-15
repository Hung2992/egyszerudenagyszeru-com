/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszerű de Nagyszerű"

interface ReturnRequestProps {
  name?: string
  orderId?: string
  reason?: string
}

const ReturnRequestEmail = ({ name, orderId, reason }: ReturnRequestProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Visszaküldési kérelmed megérkezett - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Visszaküldési kérelmed megérkezett{name ? `, ${name}` : ''}! 📋
        </Heading>
        {orderId && (
          <Text style={text}>
            <strong>Rendelés:</strong> #{orderId.slice(0, 12)}
          </Text>
        )}
        {reason && (
          <Text style={text}>
            <strong>Indok:</strong> {reason}
          </Text>
        )}
        <Hr style={hr} />
        <Text style={text}>
          Kérelmedet hamarosan feldolgozzuk és értesítünk az eredményről. A visszaküldés általában 14 munkanapon belül történik.
        </Text>
        <Text style={footer}>Üdvözlettel, {SITE_NAME} csapata</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReturnRequestEmail,
  subject: 'Visszaküldési kérelmed megérkezett 📋',
  displayName: 'Visszaküldési kérelem visszaigazolás',
  previewData: { name: 'Márk', orderId: 'abc12345-6789', reason: 'Rossz méret' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

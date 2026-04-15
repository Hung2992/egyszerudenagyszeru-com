/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
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
    <Preview>Visszaküldési kérelmed megérkezett — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Text style={brandName}>{SITE_NAME}</Text>
        </Section>
        <Section style={goldLine} />
        <Container style={container}>
          <Heading style={h1}>
            Visszaküldési kérelmed megérkezett{name ? `, ${name}` : ''}!
          </Heading>
          {(orderId || reason) && (
            <Section style={detailBox}>
              {orderId && <Text style={detailRow}><strong>Rendelés:</strong> #{orderId.slice(0, 12)}</Text>}
              {reason && <Text style={detailRow}><strong>Indok:</strong> {reason}</Text>}
            </Section>
          )}
          <Text style={text}>
            Kérelmedet hamarosan feldolgozzuk és értesítünk az eredményről. A visszaküldés általában <strong>14 munkanapon belül</strong> befejeződik.
          </Text>
          <Hr style={hr} />
          <Text style={textSmall}>
            Ha kérdésed van, keress minket a weboldalunkon.
          </Text>
        </Container>
        <Section style={footerSection}>
          <Text style={footerBrand}>{SITE_NAME}</Text>
          <Text style={footerTextStyle}>Streetwear amit érzel. ■</Text>
        </Section>
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

const main = { backgroundColor: '#f4f4f4', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", padding: '40px 0' }
const wrapper = { backgroundColor: '#ffffff', maxWidth: '600px', margin: '0 auto', border: '1px solid #e5e5e5' }
const header = { backgroundColor: '#0a0a0a', padding: '28px 32px', textAlign: 'center' as const }
const brandName = { color: '#c9a84c', fontSize: '20px', fontWeight: '700' as const, letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: '0', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const goldLine = { backgroundColor: '#c9a84c', height: '3px', width: '100%' }
const container = { padding: '36px 32px 24px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0a0a0a', margin: '0 0 20px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.7', margin: '0 0 20px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const textSmall = { fontSize: '13px', color: '#666666', lineHeight: '1.6', margin: '0' }
const detailBox = { backgroundColor: '#faf8f5', padding: '20px 24px', margin: '0 0 24px', borderLeft: '3px solid #c9a84c' }
const detailRow = { fontSize: '15px', color: '#0a0a0a', margin: '0 0 8px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footerSection = { backgroundColor: '#0a0a0a', padding: '24px 32px', textAlign: 'center' as const }
const footerBrand = { color: '#c9a84c', fontSize: '14px', fontWeight: '700' as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0 0 4px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const footerTextStyle = { color: '#666666', fontSize: '11px', margin: '0', letterSpacing: '0.05em' }

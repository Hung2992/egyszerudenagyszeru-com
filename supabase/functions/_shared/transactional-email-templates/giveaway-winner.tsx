/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszerű de Nagyszerű"

const GiveawayWinnerEmail = () => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>🎉 GRATULÁLUNK! Nyertél! — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Text style={brandName}>{SITE_NAME}</Text>
        </Section>
        <Section style={goldLine} />
        <Container style={container}>
          <Section style={winnerBadge}>
            <Text style={winnerText}>🏆 NYERTES 🏆</Text>
          </Section>
          <Heading style={h1}>
            Gratulálunk, nyertél!
          </Heading>
          <Text style={text}>
            Részt vettél a <strong>{SITE_NAME}</strong> nyereményjátékán és <strong>NYERTÉL!</strong> Minden termékünkből 1 darabot kapsz teljesen ingyen!
          </Text>
          <Text style={text}>
            Hamarosan felvesszük veled a kapcsolatot a szállítási adatokkal kapcsolatban.
          </Text>
          <Section style={buttonContainer}>
            <Button href="https://egyszerudenagyszeru.com/shop" style={button}>
              NÉZD MEG A TERMÉKEKET
            </Button>
          </Section>
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
  component: GiveawayWinnerEmail,
  subject: '🎉 Gratulálunk! Nyertél a nyereményjátékunkon!',
  displayName: 'Nyereményjáték nyertes értesítő',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#f4f4f4', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", padding: '40px 0' }
const wrapper = { backgroundColor: '#ffffff', maxWidth: '600px', margin: '0 auto', border: '1px solid #e5e5e5' }
const header = { backgroundColor: '#0a0a0a', padding: '28px 32px', textAlign: 'center' as const }
const brandName = { color: '#c9a84c', fontSize: '20px', fontWeight: '700' as const, letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: '0', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const goldLine = { backgroundColor: '#c9a84c', height: '3px', width: '100%' }
const container = { padding: '36px 32px 24px' }
const winnerBadge = { backgroundColor: '#c9a84c', padding: '14px 24px', margin: '0 0 24px', textAlign: 'center' as const }
const winnerText = { color: '#0a0a0a', fontSize: '16px', fontWeight: '700' as const, letterSpacing: '0.2em', margin: '0', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const h1 = { fontSize: '28px', fontWeight: '700' as const, color: '#0a0a0a', margin: '0 0 20px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", lineHeight: '1.3', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.7', margin: '0 0 20px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#c9a84c', color: '#0a0a0a', padding: '16px 40px', fontSize: '13px', fontWeight: '700' as const, letterSpacing: '0.15em', textDecoration: 'none', display: 'inline-block' as const, borderRadius: '0px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const footerSection = { backgroundColor: '#0a0a0a', padding: '24px 32px', textAlign: 'center' as const }
const footerBrand = { color: '#c9a84c', fontSize: '14px', fontWeight: '700' as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0 0 4px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const footerTextStyle = { color: '#666666', fontSize: '11px', margin: '0', letterSpacing: '0.05em' }

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Meghívást kaptál — {siteName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Text style={brandName}>{siteName}</Text>
        </Section>
        <Section style={goldLine} />
        <Container style={container}>
          <Heading style={h1}>Meghívó</Heading>
          <Text style={text}>
            Meghívást kaptál a{' '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>{' '}
            oldalra. Kattints az alábbi gombra a fiókod létrehozásához.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              MEGHÍVÁS ELFOGADÁSA
            </Button>
          </Section>
          <Text style={textSmall}>
            Ha nem vártad ezt a meghívót, figyelmen kívül hagyhatod.
          </Text>
        </Container>
        <Section style={footerSection}>
          <Text style={footerBrand}>{siteName}</Text>
          <Text style={footerTextStyle}>Streetwear amit érzel. ■</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#f4f4f4', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", padding: '40px 0' }
const wrapper = { backgroundColor: '#ffffff', maxWidth: '600px', margin: '0 auto', border: '1px solid #e5e5e5' }
const header = { backgroundColor: '#0a0a0a', padding: '28px 32px', textAlign: 'center' as const }
const brandName = { color: '#c9a84c', fontSize: '20px', fontWeight: '700' as const, letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: '0', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const goldLine = { backgroundColor: '#c9a84c', height: '3px', width: '100%' }
const container = { padding: '36px 32px 24px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0a0a0a', margin: '0 0 20px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.7', margin: '0 0 20px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const textSmall = { fontSize: '13px', color: '#666666', lineHeight: '1.6', margin: '0' }
const link = { color: '#c9a84c', textDecoration: 'underline' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#0a0a0a', color: '#c9a84c', padding: '16px 40px', fontSize: '13px', fontWeight: '700' as const, letterSpacing: '0.15em', textDecoration: 'none', borderRadius: '0px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", border: '2px solid #c9a84c' }
const footerSection = { backgroundColor: '#0a0a0a', padding: '24px 32px', textAlign: 'center' as const }
const footerBrand = { color: '#c9a84c', fontSize: '14px', fontWeight: '700' as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0 0 4px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const footerTextStyle = { color: '#666666', fontSize: '11px', margin: '0', letterSpacing: '0.05em' }

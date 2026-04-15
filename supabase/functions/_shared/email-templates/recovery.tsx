/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Jelszó visszaállítás — {siteName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Text style={brandName}>{siteName}</Text>
        </Section>
        <Section style={goldLine} />
        <Container style={container}>
          <Heading style={h1}>Jelszó visszaállítása</Heading>
          <Text style={text}>
            Kaptunk egy kérést a jelszavad visszaállítására a <strong>{siteName}</strong> oldalon.
            Kattints az alábbi gombra az új jelszó megadásához.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              JELSZÓ VISSZAÁLLÍTÁSA
            </Button>
          </Section>
          <Text style={textSmall}>
            Ha nem te kérted a jelszó visszaállítást, figyelmen kívül hagyhatod. A jelszavad nem fog megváltozni.
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

export default RecoveryEmail

const main = { backgroundColor: '#f4f4f4', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", padding: '40px 0' }
const wrapper = { backgroundColor: '#ffffff', maxWidth: '600px', margin: '0 auto', border: '1px solid #e5e5e5' }
const header = { backgroundColor: '#0a0a0a', padding: '28px 32px', textAlign: 'center' as const }
const brandName = { color: '#c9a84c', fontSize: '20px', fontWeight: '700' as const, letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: '0', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const goldLine = { backgroundColor: '#c9a84c', height: '3px', width: '100%' }
const container = { padding: '36px 32px 24px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0a0a0a', margin: '0 0 20px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.7', margin: '0 0 20px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const textSmall = { fontSize: '13px', color: '#666666', lineHeight: '1.6', margin: '0' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#0a0a0a', color: '#c9a84c', padding: '16px 40px', fontSize: '13px', fontWeight: '700' as const, letterSpacing: '0.15em', textDecoration: 'none', borderRadius: '0px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", border: '2px solid #c9a84c' }
const footerSection = { backgroundColor: '#0a0a0a', padding: '24px 32px', textAlign: 'center' as const }
const footerBrand = { color: '#c9a84c', fontSize: '14px', fontWeight: '700' as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0 0 4px', fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" }
const footerTextStyle = { color: '#666666', fontSize: '11px', margin: '0', letterSpacing: '0.05em' }

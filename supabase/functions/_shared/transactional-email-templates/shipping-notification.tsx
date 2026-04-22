/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  name?: string
  trackingUrl?: string
  trackingNumber?: string
}

const ShippingNotificationEmail = ({ name, trackingUrl, trackingNumber }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Csomagod úton van! — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Streetwear collective • Est. 2024</Text>
        </Section>
        <Container style={S.container}>
          <Text style={{ ...S.greeting, textAlign: 'left' as const }}>
            Szia <span style={{ color: S.COLORS.gold }}>{name || 'tag'}</span> 👋
          </Text>
          <Text style={S.heroIcon}>📦</Text>
          <Heading style={S.heroHeading}>ÚTON VAN <span style={S.heroAccent}>HOZZÁD</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>
            Feladtuk a csomagodat — hamarosan nálad lesz!
          </Text>
          {trackingNumber && (
            <Section style={S.codeBlock}>
              <Text style={S.codeLabel}>NYOMKÖVETÉSI SZÁM</Text>
              <Text style={S.codeValue}>{trackingNumber}</Text>
            </Section>
          )}
          {trackingUrl && (
            <Section style={S.buttonContainer}>
              <Button href={trackingUrl} style={S.button}>CSOMAG KÖVETÉSE</Button>
            </Section>
          )}
          <Text style={S.textSmall}>
            Kérdés a szállításról? Írj nekünk bátran.
          </Text>
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{S.SITE_NAME}</Text>
          <Text style={S.footerText}>Streetwear amit érzel. ■</Text>
        </Section>
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

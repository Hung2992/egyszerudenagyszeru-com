/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

const GiveawayWinnerEmail = () => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>🎉 GRATULÁLUNK! Nyertél! — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Streetwear collective • Est. 2024</Text>
        </Section>
        <Container style={S.container}>
          <Section style={{ backgroundColor: S.COLORS.gold, padding: '14px 24px', margin: '0 0 28px', textAlign: 'center' as const }}>
            <Text style={{ color: S.COLORS.bg, fontSize: '15px', fontWeight: 900, letterSpacing: '0.25em', margin: 0, fontFamily: S.FONT }}>🏆 NYERTES 🏆</Text>
          </Section>
          <Text style={S.heroIcon}>🎉</Text>
          <Heading style={S.heroHeading}>NYERTÉL <span style={S.heroAccent}>NÁLUNK</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>
            Részt vettél a <strong style={{ color: S.COLORS.text }}>{S.SITE_NAME}</strong> nyereményjátékán és <strong style={{ color: S.COLORS.gold }}>NYERTÉL!</strong> Minden termékünkből 1 darabot kapsz teljesen ingyen!
          </Text>
          <Text style={S.text}>
            Hamarosan felvesszük veled a kapcsolatot a szállítási adatokkal kapcsolatban.
          </Text>
          <Section style={S.buttonContainer}>
            <Button href={`${S.SITE_URL}/shop`} style={S.buttonSolid}>NÉZD MEG A TERMÉKEKET</Button>
          </Section>
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
  component: GiveawayWinnerEmail,
  subject: '🎉 Gratulálunk! Nyertél a nyereményjátékunkon!',
  displayName: 'Nyereményjáték nyertes értesítő',
  previewData: {},
} satisfies TemplateEntry

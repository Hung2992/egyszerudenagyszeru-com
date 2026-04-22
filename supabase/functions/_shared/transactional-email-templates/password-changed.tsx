/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

const PasswordChangedEmail = () => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Jelszavad megváltozott — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Streetwear collective • Est. 2024</Text>
        </Section>
        <Container style={S.container}>
          <Text style={S.heroIcon}>🔒</Text>
          <Heading style={S.heroHeading}>JELSZÓ <span style={S.heroAccent}>FRISSÍTVE</span></Heading>
          <Section style={S.goldDivider} />
          <Section style={{ ...S.infoCard, textAlign: 'center' as const, borderLeft: 'none', border: `1px solid ${S.COLORS.gold}` }}>
            <Text style={{ color: S.COLORS.gold, fontSize: '13px', fontWeight: 700, letterSpacing: '0.2em', margin: 0, fontFamily: S.FONT }}>🔒 BIZTONSÁGI ÉRTESÍTÉS</Text>
          </Section>
          <Text style={S.text}>
            A fiókod jelszava sikeresen megváltozott. Ha nem te kezdeményezted, <strong style={{ color: S.COLORS.gold }}>azonnal vedd fel velünk a kapcsolatot</strong>.
          </Text>
          <Text style={S.textSmall}>
            Biztonsági okokból küldtük ezt az értesítést. Soha ne oszd meg jelszavadat.
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
  component: PasswordChangedEmail,
  subject: 'Jelszavad megváltozott 🔒',
  displayName: 'Jelszó módosítás értesítés',
  previewData: {},
} satisfies TemplateEntry

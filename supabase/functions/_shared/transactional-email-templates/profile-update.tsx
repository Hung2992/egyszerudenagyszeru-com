/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { name?: string }

const ProfileUpdateEmail = ({ name }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Profilod frissítve — {S.SITE_NAME}</Preview>
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
          <Text style={S.heroIcon}>⚙️</Text>
          <Heading style={S.heroHeading}>PROFIL <span style={S.heroAccent}>FRISSÍTVE</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>
            A profilod adatai sikeresen módosultak. Ha nem te végezted a módosítást, <strong style={{ color: S.COLORS.gold }}>azonnal változtasd meg a jelszavad</strong>.
          </Text>
          <Text style={S.textSmall}>
            Biztonsági okokból küldtük ezt az értesítést.
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
  component: ProfileUpdateEmail,
  subject: 'Profilod frissítve',
  displayName: 'Profil módosítás visszaigazolás',
  previewData: { name: 'Márk' },
} satisfies TemplateEntry

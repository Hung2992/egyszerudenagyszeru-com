/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { name?: string }

const DeliveryConfirmationEmail = ({ name }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Csomagod megérkezett! — {S.SITE_NAME}</Preview>
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
          <Text style={S.heroIcon}>🎉</Text>
          <Heading style={S.heroHeading}>MEGÉRKEZETT <span style={S.heroAccent}>HOZZÁD</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>
            A rendelésed sikeresen kézbesítve. Reméljük, tetszeni fog és hamarosan újra nálunk vásárolsz!
          </Text>
          <Section style={S.buttonContainer}>
            <Button href={`${S.SITE_URL}/profile`} style={S.button}>VÉLEMÉNY ÍRÁSA</Button>
          </Section>
          <Text style={S.textSmall}>
            Probléma? Keress minket a weboldalon és segítünk.
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
  component: DeliveryConfirmationEmail,
  subject: 'Csomagod kézbesítve! ✅',
  displayName: 'Kézbesítési visszaigazolás',
  previewData: { name: 'Márk' },
} satisfies TemplateEntry

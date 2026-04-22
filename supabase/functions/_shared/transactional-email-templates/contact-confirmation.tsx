/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { name?: string }

const ContactConfirmationEmail = ({ name }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Üzeneted megérkezett — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Streetwear collective • Est. 2024</Text>
        </Section>
        <Container style={S.container}>
          <Text style={{ ...S.greeting, textAlign: 'left' as const }}>
            Szia <span style={{ color: S.COLORS.gold }}>{name || 'csapattag'}</span> 👋
          </Text>
          <Text style={S.heroIcon}>📩</Text>
          <Heading style={S.heroHeading}>ÜZENETED <span style={S.heroAccent}>MEGÉRKEZETT</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>
            Megkaptuk a megkeresésed és csapatunk hamarosan válaszol. Általában <strong style={{ color: S.COLORS.text }}>24 órán belül</strong> visszajelzünk.
          </Text>
          <Text style={S.textSmall}>
            Ha sürgős, írj ránk a közösségi oldalainkon.
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
  component: ContactConfirmationEmail,
  subject: 'Üzeneted megérkezett',
  displayName: 'Kapcsolatfelvétel visszaigazolás',
  previewData: { name: 'Márk' },
} satisfies TemplateEntry

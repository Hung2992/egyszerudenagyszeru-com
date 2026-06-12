/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { full_name?: string; amount?: number; payment_reference?: string; admin_notes?: string }

const PartnerPayoutPaid = ({ full_name, amount, payment_reference, admin_notes }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Partner jutalék kifizetve — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Partner kifizetés</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>JUTALÉK <span style={S.heroAccent}>KIFIZETVE</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>{full_name ? `${full_name},` : ''} a kifizetési kérésed feldolgoztuk.</Text>
          <Text style={{ ...S.text, fontSize: 24, fontWeight: 'bold', color: S.COLORS.gold }}>
            {amount ? `${amount.toLocaleString('hu-HU')} Ft` : ''}
          </Text>
          {payment_reference && <Text style={S.textSmall}>Tranzakció azonosító: <strong>{payment_reference}</strong></Text>}
          {admin_notes && <Text style={S.textSmall}>{admin_notes}</Text>}
          <Text style={S.textSmall}>Köszönjük az együttműködést — a jutalék-egyenleged frissült a partner felületen.</Text>
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{S.SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartnerPayoutPaid,
  subject: 'Partner jutalék kifizetve — Egyszerű de Nagyszerű',
  displayName: 'Partner kifizetés visszaigazolás',
  previewData: { full_name: 'Kiss János', amount: 12500, payment_reference: 'NAV-2026-0001' },
} satisfies TemplateEntry

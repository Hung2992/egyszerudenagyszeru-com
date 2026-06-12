/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { full_name?: string; coupon_code?: string; portal_url?: string }

const PartnerWelcome = ({ full_name, coupon_code, portal_url }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Üdv a partner programban — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Partner program</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>ÜDV A <span style={S.heroAccent}>FEDÉLZETEN</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>{full_name ? `${full_name},` : ''} a fiókod aktív, készen állsz a kommunikációra.</Text>
          {coupon_code && (
            <Text style={S.text}>A kuponkódod: <strong style={{ color: S.COLORS.gold }}>{coupon_code}</strong></Text>
          )}
          {portal_url && (
            <Section style={S.buttonContainer}>
              <Button href={portal_url} style={S.button}>PARTNER FELÜLET</Button>
            </Section>
          )}
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{S.SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartnerWelcome,
  subject: 'Üdv a partner programban — Egyszerű de Nagyszerű',
  displayName: 'Partner üdvözlő',
  previewData: { full_name: 'Kiss János', coupon_code: 'PARTNER-AB12', portal_url: 'https://example.com/partner' },
} satisfies TemplateEntry

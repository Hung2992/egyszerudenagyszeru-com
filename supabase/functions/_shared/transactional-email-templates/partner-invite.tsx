/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Link } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  invite_link?: string
  inviter_name?: string
  full_name?: string
  coupon_code?: string
  commission_per_order?: number
}

const PartnerInvite = ({ invite_link, inviter_name, full_name, coupon_code, commission_per_order }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Partner meghívás — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Partner program</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>PARTNER <span style={S.heroAccent}>MEGHÍVÁS</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>{full_name ? `Szia ${full_name}!` : 'Szia!'}</Text>
          <Text style={S.text}>
            {inviter_name || 'A webshop tulajdonosa'} meghívott a hivatalos partner programba.
            Ez azt jelenti, hogy saját kuponkódot kapsz, amit megosztva mindenki, aki vásárol vele,
            <strong> kedvezményt kap</strong>, te pedig <strong>{commission_per_order || 0} Ft jutalékot</strong> minden teljesített rendelés után.
          </Text>
          {coupon_code && (
            <Section style={{ textAlign: 'center', padding: '20px 0' }}>
              <Text style={{ ...S.textSmall, marginBottom: 8 }}>A te egyedi kuponod:</Text>
              <Text style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 3, color: S.COLORS.gold, fontFamily: 'monospace' }}>
                {coupon_code}
              </Text>
            </Section>
          )}
          {invite_link && (
            <Section style={S.buttonContainer}>
              <Button href={invite_link} style={S.button}>BELÉPÉS A PARTNER FELÜLETRE</Button>
            </Section>
          )}
          <Text style={S.textSmall}>
            A partner felületen valós időben látod a kuponoddal érkezett rendeléseket, a felhalmozott jutalékot, marketing anyagokat tudsz letölteni és kifizetést tudsz kérni.
          </Text>
          {invite_link && (
            <Text style={S.textSmall}>
              Ha a gomb nem működik: <Link href={invite_link} style={{ color: S.COLORS.gold }}>{invite_link}</Link>
            </Text>
          )}
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{S.SITE_NAME}</Text>
          <Text style={S.footerText}>Hivatalos partner program · Auditált jutalékszámítás</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartnerInvite,
  subject: 'Partner meghívás — Egyszerű de Nagyszerű',
  displayName: 'Partner meghívó',
  previewData: { invite_link: 'https://example.com/partner', inviter_name: 'Egyszerű de Nagyszerű', full_name: 'Kiss János', coupon_code: 'PARTNER-AB12', commission_per_order: 1000 },
} satisfies TemplateEntry

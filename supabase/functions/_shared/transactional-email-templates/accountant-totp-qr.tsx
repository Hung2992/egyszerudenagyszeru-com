/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { qr_data_url?: string; secret?: string; backup_codes?: string[] }

const AccountantTotpQr = ({ qr_data_url, secret, backup_codes }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Könyvelői 2FA aktiváló QR kód — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Könyvelői 2FA aktiváló</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>QR <span style={S.heroAccent}>KÓD</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>Olvasd be az alábbi QR kódot az authenticator alkalmazásoddal (Google Authenticator, 1Password, Authy, Microsoft Authenticator).</Text>
          {qr_data_url && (
            <Section style={{ textAlign: 'center', padding: '16px 0' }}>
              <Img src={qr_data_url} alt="TOTP QR" width="240" height="240" style={{ margin: '0 auto', border: '1px solid #ddd' }} />
            </Section>
          )}
          {secret && (
            <Text style={S.textSmall}>Manuális kód: <strong style={{ fontFamily: 'monospace' }}>{secret}</strong></Text>
          )}
          {backup_codes && backup_codes.length > 0 && (
            <>
              <Text style={S.textSmall}><strong>Backup kódok (mentsd el biztos helyre):</strong></Text>
              <Text style={{ ...S.textSmall, fontFamily: 'monospace' }}>{backup_codes.join(' · ')}</Text>
            </>
          )}
          <Text style={S.textSmall}>Ne továbbítsd ezt az e-mailt senkinek. Ha nem te kérted, jelentsd az adminisztrátornak.</Text>
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{S.SITE_NAME}</Text>
          <Text style={S.footerText}>Biztonsági e-mail · ne válaszolj rá</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountantTotpQr,
  subject: 'Könyvelői 2FA aktiváló QR kód — Egyszerű de Nagyszerű',
  displayName: 'Könyvelő TOTP QR',
  previewData: { secret: 'JBSWY3DPEHPK3PXP', backup_codes: ['ABCD1234', 'EFGH5678'] },
} satisfies TemplateEntry

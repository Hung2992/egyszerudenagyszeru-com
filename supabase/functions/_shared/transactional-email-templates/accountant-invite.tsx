/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Link } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { invite_link?: string; inviter_name?: string }

const AccountantInvite = ({ invite_link, inviter_name }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Könyvelői hozzáférés — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Könyvelői központ</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>KÖNYVELŐI <span style={S.heroAccent}>HOZZÁFÉRÉS</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>
            {inviter_name || 'A webshop tulajdonosa'} meghívott, hogy könyvelőként hozzáférj a vállalkozása pénzügyi adataihoz a <strong>{S.SITE_NAME}</strong> rendszerében.
          </Text>
          <Text style={S.text}>
            A linkre kattintva regisztrálhatsz / belépsz. Onnantól csak a <strong>/konyvelo</strong> felületet látod: számlák, ÁFA-összesítő, költségek, NAV export.
          </Text>
          {invite_link && (
            <Section style={S.buttonContainer}>
              <Button href={invite_link} style={S.button}>BELÉPÉS A KÖNYVELŐI FELÜLETRE</Button>
            </Section>
          )}
          <Text style={S.textSmall}>
            Biztonsági okból javasoljuk, hogy első belépés után aktiváld a kétlépcsős hitelesítést (Google Authenticator / 1Password / Authy).
          </Text>
          {invite_link && (
            <Text style={S.textSmall}>
              Ha a gomb nem működik: <Link href={invite_link} style={{ color: S.COLORS.gold }}>{invite_link}</Link>
            </Text>
          )}
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{S.SITE_NAME}</Text>
          <Text style={S.footerText}>Csak olvasási jogosultság · minden lekérdezés auditálva</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountantInvite,
  subject: 'Könyvelői hozzáférés — Egyszerű de Nagyszerű',
  displayName: 'Könyvelő meghívó',
  previewData: { invite_link: 'https://example.com/konyvelo', inviter_name: 'Egyszerű de Nagyszerű' },
} satisfies TemplateEntry

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { full_name?: string; portal_url?: string; storefront_url?: string }

const PartnerFeatureAnnouncement = ({ full_name, portal_url, storefront_url }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Új: napi naptár és szolgáltatás-termékek a Partner Központban</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Partner újdonságok</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>NAPTÁR ÉS <span style={S.heroAccent}>SZOLGÁLTATÁSOK</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>{full_name ? `${full_name},` : 'Kedves Partnerünk,'} két új funkció érhető el a Partner Központban.</Text>
          <Text style={S.text}>
            <strong>Napi naptár</strong> — havi nézet és napi bontás: időpont, ügyfél, szolgáltatás, helyszín, időtartam.
          </Text>
          <Text style={S.text}>
            <strong>Ma kikkel kell beszélni</strong> — a mai ügyfelek listája hívás, e-mail és SMS gombbal.
          </Text>
          <Text style={S.text}>
            <strong>Digitális termék, kurzus és szolgáltatás</strong> — külön beállítások: átadás, licenc, oktató, kapacitás, munkanapok, előleg, garancia. Új foglalásnál az ügyfél automatikus visszaigazolást kap.
          </Text>
          {portal_url && (
            <Section style={S.buttonContainer}>
              <Button href={portal_url} style={S.button}>PARTNER KÖZPONT</Button>
            </Section>
          )}
          {storefront_url && (
            <Text style={S.text}>A saját márkaoldalad: {storefront_url}</Text>
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
  component: PartnerFeatureAnnouncement,
  subject: 'Új a Partner Központban: naptár és szolgáltatás-termékek',
  displayName: 'Partner bemutató (naptár + szolgáltatások)',
  previewData: { full_name: 'Kiss János', portal_url: 'https://example.com/partner', storefront_url: 'https://example.com/b/marka' },
} satisfies TemplateEntry

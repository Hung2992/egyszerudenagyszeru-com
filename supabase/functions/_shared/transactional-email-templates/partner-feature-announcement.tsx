/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  full_name?: string
  headline?: string
  intro?: string
  bullets?: string[] | string
  cta_label?: string
  cta_url?: string
}

const toList = (b?: string[] | string) =>
  Array.isArray(b) ? b : String(b || '').split('\n').map(x => x.trim()).filter(Boolean)

const PartnerFeatureAnnouncement = ({ full_name, headline, intro, bullets, cta_label, cta_url }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>{headline || 'Új partner funkciók'} — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Partner újdonságok</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>{headline || 'ÚJ PARTNER FUNKCIÓK'}</Heading>
          <Section style={S.goldDivider} />
          {full_name && <Text style={S.text}>{full_name},</Text>}
          <Text style={S.text}>{intro || 'Két új eszközt kapsz a Partner Központban: napi naptárat és bővített szolgáltatás-beállításokat.'}</Text>
          {toList(bullets).map((b, i) => (
            <Text key={i} style={S.textSmall}>• {b}</Text>
          ))}
          {cta_url && (
            <Section style={{ textAlign: 'center', marginTop: 24 }}>
              <Button href={cta_url} style={S.button}>{cta_label || 'Megnézem a Partner Központban'}</Button>
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
  component: PartnerFeatureAnnouncement,
  subject: (data: Record<string, any>) => `${data?.headline || 'Új partner funkciók'} — Egyszerű de Nagyszerű`,
  displayName: 'Partner funkció bemutató',
  previewData: {
    full_name: 'Kiss János',
    headline: 'NAPTÁR ÉS SZOLGÁLTATÁSOK',
    intro: 'Mostantól a Partner Központban napi naptárat vezethetsz, és látod, kikkel kell ma beszélned.',
    bullets: [
      'Napi naptár: időpontok, helyszín, időtartam egy nézetben.',
      'Ma kikkel kell beszélni: hívás, e-mail, SMS egy kattintással.',
      'Digitális termék, kurzus és szolgáltatás beállítások.',
      'Az ügyfél automatikus visszaigazoló levelet kap.',
    ],
    cta_label: 'Megnézem a Partner Központban',
    cta_url: 'https://egyszerudenagyszeru.com/partner',
  },
} satisfies TemplateEntry

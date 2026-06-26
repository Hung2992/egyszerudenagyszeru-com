/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { full_name?: string; domain?: string; admin_note?: string; portal_url?: string }

const Email = ({ full_name, domain, admin_note, portal_url }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Domain elutasítva — {domain}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Partner program</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>DOMAIN <span style={S.heroAccent}>ELUTASÍTVA</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>{full_name ? `${full_name},` : 'Üdv,'} a beküldött domain ({domain}) nem került jóváhagyásra.</Text>
          {admin_note && <Text style={S.text}><strong>Indoklás:</strong> {admin_note}</Text>}
          <Text style={S.text}>Kérjük ellenőrizd a DNS rekordokat és próbáld újra.</Text>
          {portal_url && (
            <Section style={S.buttonContainer}>
              <Button href={portal_url} style={S.button}>DOMAIN BEÁLLÍTÁSOK</Button>
            </Section>
          )}
        </Container>
        <Section style={S.footerSection}><Text style={S.footerBrand}>{S.SITE_NAME}</Text></Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Domain elutasítva: ${d.domain || ''}`.trim(),
  displayName: 'Partner domain elutasítva',
  previewData: { full_name: 'Kiss János', domain: 'myshop.hu', admin_note: 'A TXT rekord hiányzik.', portal_url: 'https://example.com/partner' },
} satisfies TemplateEntry

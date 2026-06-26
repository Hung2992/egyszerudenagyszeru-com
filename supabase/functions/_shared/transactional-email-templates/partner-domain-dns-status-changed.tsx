/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { full_name?: string; domain?: string; previous_status?: string; new_status?: string; portal_url?: string }

const LABEL: Record<string, string> = {
  not_checked: 'még nem ellenőrzött',
  self_reported: 'partner által beállítva',
  verified: 'ellenőrzött ✓',
  failed: 'sikertelen ✗',
};

const Email = ({ full_name, domain, previous_status, new_status, portal_url }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>DNS állapot változás — {domain}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Partner program</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>DNS <span style={S.heroAccent}>ÁLLAPOT</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>{full_name ? `${full_name},` : 'Üdv,'} az automatikus DNS ellenőrzés állapota változott a domainedhez:</Text>
          <Text style={{ ...S.text, fontFamily: 'monospace', fontSize: 16 }}>{domain}</Text>
          <Text style={S.text}>
            <strong>{LABEL[previous_status || ''] || previous_status}</strong> → <strong>{LABEL[new_status || ''] || new_status}</strong>
          </Text>
          {new_status === 'verified' && <Text style={S.text}>Most már jóváhagyásra vár az admin oldalon.</Text>}
          {new_status === 'failed' && <Text style={S.text}>Kérjük ellenőrizd újra a DNS rekordokat a regisztrátorodnál.</Text>}
          {portal_url && (
            <Section style={S.buttonContainer}>
              <Button href={portal_url} style={S.button}>RÉSZLETEK</Button>
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
  subject: (d: Record<string, any>) => `DNS állapot változás: ${d.domain || ''}`.trim(),
  displayName: 'Partner domain DNS változás',
  previewData: { full_name: 'Kiss János', domain: 'myshop.hu', previous_status: 'failed', new_status: 'verified', portal_url: 'https://example.com/partner' },
} satisfies TemplateEntry

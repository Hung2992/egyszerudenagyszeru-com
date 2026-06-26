/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { full_name?: string; domain?: string; portal_url?: string; admin_note?: string }

const Email = ({ full_name, domain, portal_url, admin_note }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Domain jóváhagyva — {domain}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Partner program</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>DOMAIN <span style={S.heroAccent}>JÓVÁHAGYVA</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>{full_name ? `${full_name},` : 'Üdv,'} a kért domain elérhető a webshopodhoz:</Text>
          <Text style={{ ...S.text, fontFamily: 'monospace', fontSize: 18 }}>{domain}</Text>
          {admin_note && <Text style={S.text}>Admin megjegyzés: {admin_note}</Text>}
          {portal_url && (
            <Section style={S.buttonContainer}>
              <Button href={portal_url} style={S.button}>PARTNER FELÜLET</Button>
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
  subject: (d: Record<string, any>) => `Domain jóváhagyva: ${d.domain || ''}`.trim(),
  displayName: 'Partner domain jóváhagyva',
  previewData: { full_name: 'Kiss János', domain: 'myshop.hu', portal_url: 'https://example.com/partner' },
} satisfies TemplateEntry

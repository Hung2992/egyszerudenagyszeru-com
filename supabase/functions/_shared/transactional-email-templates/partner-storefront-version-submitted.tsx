/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { full_name?: string; storefront_name?: string; submitted_at?: string; portal_url?: string }

const Email = ({ full_name, storefront_name, submitted_at, portal_url }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Új verzió beküldve jóváhagyásra — {storefront_name}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Partner program</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>VERZIÓ <span style={S.heroAccent}>BEKÜLDVE</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>{full_name ? `${full_name},` : 'Üdv,'} sikeresen beküldted az új storefront verziódat jóváhagyásra.</Text>
          {storefront_name && <Text style={S.text}><strong>Webshop:</strong> {storefront_name}</Text>}
          {submitted_at && <Text style={S.text}><strong>Beküldve:</strong> {submitted_at}</Text>}
          <Text style={S.text}>Az admin csapat hamarosan átnézi és visszajelez az állapotról.</Text>
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
  subject: (d: Record<string, any>) => `Új verzió beküldve: ${d.storefront_name || ''}`.trim(),
  displayName: 'Storefront verzió beküldve',
  previewData: { full_name: 'Kiss János', storefront_name: 'My Shop', submitted_at: '2026-06-26 12:00', portal_url: 'https://example.com/partner' },
} satisfies TemplateEntry

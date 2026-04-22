/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  name?: string
  replyText?: string
  originalMessage?: string
  originalSubject?: string
}

const ContactReplyEmail = ({ name, replyText, originalMessage, originalSubject }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Válasz az üzenetedre — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Streetwear collective • Est. 2024</Text>
        </Section>
        <Container style={S.container}>
          <Text style={{ ...S.greeting, textAlign: 'left' as const }}>
            Szia <span style={{ color: S.COLORS.gold }}>{name || 'tag'}</span> 👋
          </Text>
          <Text style={S.heroIcon}>✉️</Text>
          <Heading style={S.heroHeading}>VÁLASZ <span style={S.heroAccent}>NEKED</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.textLeft}>
            Köszönjük, hogy írtál! Itt a válaszunk:
          </Text>
          <Section style={S.infoCard}>
            <Text style={{ ...S.infoValue, whiteSpace: 'pre-wrap' as const, fontWeight: '400' as const, fontSize: '15px', lineHeight: '1.6' }}>
              {replyText || ''}
            </Text>
          </Section>
          {originalMessage && (
            <>
              <Hr style={S.hr} />
              <Text style={S.infoLabel}>Eredeti üzeneted{originalSubject ? ` — ${originalSubject}` : ''}</Text>
              <Text style={{ ...S.textLeft, color: S.COLORS.textDim, fontSize: '13px', whiteSpace: 'pre-wrap' as const, marginTop: '8px' }}>
                {originalMessage}
              </Text>
            </>
          )}
          <Text style={S.textSmall}>
            Ha további kérdésed van, válaszolj erre az e-mailre.
          </Text>
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{S.SITE_NAME}</Text>
          <Text style={S.footerText}>Streetwear amit érzel. ■</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactReplyEmail,
  subject: (data: Record<string, any>) =>
    data?.originalSubject ? `Re: ${data.originalSubject}` : 'Válasz az üzenetedre',
  displayName: 'Kapcsolati válasz (admin)',
  previewData: {
    name: 'Márk',
    replyText: 'Köszönjük az üzenetedet! A rendelésed úton van, holnap kézbesítjük.',
    originalMessage: 'Szia! Mikor érkezik a csomagom?',
    originalSubject: 'Rendelés státusz',
  },
} satisfies TemplateEntry

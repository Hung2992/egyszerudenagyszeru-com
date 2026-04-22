/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  name?: string
  orderId?: string
  reason?: string
}

const ReturnRequestEmail = ({ name, orderId, reason }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Visszaküldési kérelmed megérkezett — {S.SITE_NAME}</Preview>
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
          <Text style={S.heroIcon}>📋</Text>
          <Heading style={S.heroHeading}>KÉRELMED <span style={S.heroAccent}>MEGÉRKEZETT</span></Heading>
          <Section style={S.goldDivider} />
          {(orderId || reason) && (
            <Section style={S.infoCard}>
              {orderId && (
                <>
                  <Text style={S.infoLabel}>RENDELÉS</Text>
                  <Text style={S.infoValue}>#{orderId.slice(0, 12)}</Text>
                </>
              )}
              {reason && (
                <>
                  <Text style={{ ...S.infoLabel, marginTop: '12px' }}>INDOK</Text>
                  <Text style={S.infoValue}>{reason}</Text>
                </>
              )}
            </Section>
          )}
          <Text style={S.text}>
            Kérelmedet hamarosan feldolgozzuk és értesítünk az eredményről. A visszaküldés általában <strong style={{ color: S.COLORS.text }}>14 munkanapon belül</strong> befejeződik.
          </Text>
          <Text style={S.textSmall}>
            Kérdés? Keress minket a weboldalunkon.
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
  component: ReturnRequestEmail,
  subject: 'Visszaküldési kérelmed megérkezett 📋',
  displayName: 'Visszaküldési kérelem visszaigazolás',
  previewData: { name: 'Márk', orderId: 'abc12345-6789', reason: 'Rossz méret' },
} satisfies TemplateEntry

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  name?: string
  totalAmount?: string
  itemCount?: number
  orderId?: string
}

const OrderConfirmationEmail = ({ name, totalAmount, itemCount, orderId }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Rendelésed megérkezett — {S.SITE_NAME}</Preview>
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
          <Text style={S.heroIcon}>✓</Text>
          <Heading style={S.heroHeading}>RENDELÉS <span style={S.heroAccent}>MEGERŐSÍTVE</span></Heading>
          <Section style={S.goldDivider} />
          {orderId && (
            <Text style={{ ...S.text, marginBottom: '24px' }}>
              Rendelésszám: <span style={{ color: S.COLORS.gold, fontWeight: 700 }}>#{orderId.slice(0, 8)}</span>
            </Text>
          )}
          <Section style={S.infoCard}>
            {itemCount && (
              <>
                <Text style={S.infoLabel}>TERMÉKEK</Text>
                <Text style={S.infoValue}>{itemCount} db</Text>
              </>
            )}
            {totalAmount && (
              <>
                <Text style={S.infoLabel}>ÖSSZEG</Text>
                <Text style={S.infoValueGold}>{totalAmount} Ft</Text>
              </>
            )}
          </Section>
          <Text style={S.text}>
            Rendelésedet feldolgozzuk és értesítünk, amint feladtuk. Szállítás általában <strong style={{ color: S.COLORS.text }}>2-5 munkanap</strong>.
          </Text>
          <Text style={S.textSmall}>
            Kérdés? Írj nekünk a Kapcsolat oldalon.
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
  component: OrderConfirmationEmail,
  subject: 'Rendelésed visszaigazolása',
  displayName: 'Rendelés visszaigazolás',
  previewData: { name: 'Márk', totalAmount: '14 990', itemCount: 2, orderId: 'a1b2c3d4-5678' },
} satisfies TemplateEntry

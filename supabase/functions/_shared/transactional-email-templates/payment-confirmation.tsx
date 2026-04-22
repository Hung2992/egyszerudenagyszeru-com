/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  name?: string
  totalAmount?: string
  paymentMethod?: string
}

const PaymentConfirmationEmail = ({ name, totalAmount, paymentMethod }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Fizetésed visszaigazolva — {S.SITE_NAME}</Preview>
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
          <Text style={S.heroIcon}>💳</Text>
          <Heading style={S.heroHeading}>FIZETÉS <span style={S.heroAccent}>SIKERES</span></Heading>
          <Section style={S.goldDivider} />
          <Section style={S.infoCard}>
            {totalAmount && (
              <>
                <Text style={S.infoLabel}>ÖSSZEG</Text>
                <Text style={S.infoValueGold}>{totalAmount} Ft</Text>
              </>
            )}
            {paymentMethod && (
              <>
                <Text style={{ ...S.infoLabel, marginTop: '12px' }}>FIZETÉSI MÓD</Text>
                <Text style={S.infoValue}>{paymentMethod}</Text>
              </>
            )}
            <Text style={{ ...S.infoLabel, marginTop: '12px' }}>ÁLLAPOT</Text>
            <Text style={S.infoValue}>Sikeres ✓</Text>
          </Section>
          <Text style={S.text}>
            Rendelésedet hamarosan feldolgozzuk. A szállítási értesítőt külön e-mailben kapod meg.
          </Text>
          <Text style={S.textSmall}>
            Kérdés? Keress minket az ügyfélszolgálatunkon.
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
  component: PaymentConfirmationEmail,
  subject: 'Fizetésed visszaigazolva! 💳',
  displayName: 'Fizetés visszaigazolás',
  previewData: { name: 'Márk', totalAmount: '14 990', paymentMethod: 'Bankkártya' },
} satisfies TemplateEntry

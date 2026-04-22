/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  name?: string
  couponCode?: string
  discountText?: string
}

const CouponNotificationEmail = ({ name, couponCode, discountText }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Kuponkódod megérkezett! — {S.SITE_NAME}</Preview>
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
          <Text style={S.heroIcon}>🎁</Text>
          <Heading style={S.heroHeading}>ITT A <span style={S.heroAccent}>KUPONOD</span></Heading>
          <Section style={S.goldDivider} />
          {couponCode && (
            <Section style={S.codeBlock}>
              <Text style={S.codeLabel}>KUPONKÓD</Text>
              <Text style={S.codeValue}>{couponCode}</Text>
              {discountText && <Text style={{ ...S.text, color: S.COLORS.gold, margin: '12px 0 0', fontWeight: 600 }}>{discountText}</Text>}
            </Section>
          )}
          <Text style={S.text}>
            Használd fel a pénztárnál a következő rendelésednél!
          </Text>
          <Section style={S.buttonContainer}>
            <Button href={`${S.SITE_URL}/shop`} style={S.button}>VÁSÁRLÁS MOST</Button>
          </Section>
          <Text style={S.textSmall}>
            A kuponkód egyszer használható és nem kombinálható más kedvezménnyel.
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
  component: CouponNotificationEmail,
  subject: 'Kuponkódod megérkezett! 🎁',
  displayName: 'Kupon értesítés',
  previewData: { name: 'Márk', couponCode: 'KEDVEZMENY20', discountText: '20% kedvezmény' },
} satisfies TemplateEntry

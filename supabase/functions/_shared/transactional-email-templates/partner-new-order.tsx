/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  storeName?: string
  orderNumber?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  itemsText?: string
  subtotal?: string
  shipping?: string
  total?: string
  shippingMethod?: string
  address?: string
  paymentMethod?: string
}

const PartnerNewOrderEmail = ({
  storeName, orderNumber, customerName, customerEmail, customerPhone,
  itemsText, subtotal, shipping, total, shippingMethod, address, paymentMethod,
}: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Új rendelés érkezett — {orderNumber || ''}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>{storeName || S.SITE_NAME}</Heading>
          <Text style={S.brandTagline}>Új rendelés</Text>
        </Section>
        <Container style={S.container}>
          <Text style={S.heroIcon}>🛒</Text>
          <Heading style={S.heroHeading}>ÚJ <span style={S.heroAccent}>RENDELÉS</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={{ ...S.text, marginBottom: '20px' }}>
            Rendelésszám: <span style={{ color: S.COLORS.gold, fontWeight: 700 }}>{orderNumber}</span>
          </Text>

          <Section style={S.infoCard}>
            <Text style={S.infoLabel}>VÁSÁRLÓ</Text>
            <Text style={S.infoValue}>{customerName}</Text>
            <Text style={S.infoValue}>{customerEmail}</Text>
            {customerPhone ? <Text style={S.infoValue}>{customerPhone}</Text> : null}
          </Section>

          <Section style={S.infoCard}>
            <Text style={S.infoLabel}>TÉTELEK</Text>
            <Text style={S.infoValue}>{itemsText}</Text>
            <Text style={S.infoLabel}>RÉSZÖSSZEG</Text>
            <Text style={S.infoValue}>{subtotal} Ft</Text>
            <Text style={S.infoLabel}>SZÁLLÍTÁS{shippingMethod ? ` – ${shippingMethod}` : ''}</Text>
            <Text style={S.infoValue}>{shipping} Ft</Text>
            <Text style={S.infoLabel}>VÉGÖSSZEG</Text>
            <Text style={S.infoValueGold}>{total} Ft</Text>
          </Section>

          {address ? (
            <Section style={S.infoCard}>
              <Text style={S.infoLabel}>SZÁLLÍTÁSI CÍM</Text>
              <Text style={S.infoValue}>{address}</Text>
            </Section>
          ) : null}

          <Text style={S.textSmall}>
            Fizetési mód: {paymentMethod}. A rendelést a Partner Központ „Rendelések” fülén kezelheted.
          </Text>
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{S.SITE_NAME}</Text>
          <Text style={S.footerText}>Partner platform ■</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartnerNewOrderEmail,
  subject: (data: Record<string, any>) => `Új rendelés: ${data?.orderNumber || ''}`,
  displayName: 'Partner – új rendelés értesítő',
  previewData: {
    storeName: 'URBANSTYLE BOUTIQUE',
    orderNumber: 'PO-2026-0001',
    customerName: 'Kiss Anna',
    customerEmail: 'anna@example.com',
    customerPhone: '+36 30 123 4567',
    itemsText: '2 × Oversize póló',
    subtotal: '14 980',
    shipping: '1 490',
    total: '16 470',
    shippingMethod: 'Házhozszállítás',
    address: '1051 Budapest, Fő utca 1.',
    paymentMethod: 'Utánvét',
  },
} satisfies TemplateEntry

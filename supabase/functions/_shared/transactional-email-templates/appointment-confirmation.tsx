/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props {
  customer_name?: string
  brand_name?: string
  service_title?: string
  date_label?: string
  time_label?: string
  duration_min?: number
  location?: string
  meeting_url?: string
  notes?: string
  contact_email?: string
  contact_phone?: string
}

const AppointmentConfirmation = ({
  customer_name, brand_name, service_title, date_label, time_label,
  duration_min, location, meeting_url, notes, contact_email, contact_phone,
}: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Időpont visszaigazolás{date_label ? ` — ${date_label} ${time_label || ''}` : ''}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>{brand_name || S.SITE_NAME}</Heading>
          <Text style={S.brandTagline}>Időpont visszaigazolás</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>FOGLALÁSOD <span style={S.heroAccent}>RÖGZÍTVE</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>{customer_name ? `${customer_name},` : 'Kedves Ügyfelünk,'} lefoglaltuk az időpontodat.</Text>

          <Text style={{ ...S.text, fontSize: 22, fontWeight: 'bold', color: S.COLORS.gold }}>
            {[date_label, time_label].filter(Boolean).join(' · ') || 'Egyeztetés alatt'}
          </Text>

          {service_title && <Text style={S.textSmall}>Szolgáltatás: <strong>{service_title}</strong></Text>}
          {duration_min ? <Text style={S.textSmall}>Időtartam: <strong>{duration_min} perc</strong></Text> : null}
          {location && <Text style={S.textSmall}>Helyszín: <strong>{location}</strong></Text>}
          {meeting_url && <Text style={S.textSmall}>Online belépés: {meeting_url}</Text>}
          {notes && <Text style={S.textSmall}>Megjegyzés: {notes}</Text>}

          <Section style={S.goldDivider} />
          <Text style={S.textSmall}>
            Ha módosítanál vagy lemondanál, válaszolj erre a levélre
            {contact_email ? ` vagy írj ide: ${contact_email}` : ''}
            {contact_phone ? `, illetve hívj: ${contact_phone}` : ''}.
          </Text>
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{brand_name || S.SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AppointmentConfirmation,
  subject: (d: Record<string, any>) =>
    `Időpont visszaigazolás${d?.date_label ? ` — ${d.date_label} ${d?.time_label || ''}` : ''}`.trim(),
  displayName: 'Időpont visszaigazolás',
  previewData: {
    customer_name: 'Kiss Anna',
    brand_name: 'ApexParts',
    service_title: '45 perces üzleti gyors-audit',
    date_label: '2026. szeptember 15.',
    time_label: '14:00',
    duration_min: 45,
    location: 'Online (Google Meet)',
    contact_email: 'info@apexparts.hu',
  },
} satisfies TemplateEntry

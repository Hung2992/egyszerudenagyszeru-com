/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Props { portal_url?: string }

const AccountantWelcome = ({ portal_url }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Sikeres aktiválás — könyvelői hozzáférés</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Könyvelői központ aktiválva</Text>
        </Section>
        <Container style={S.container}>
          <Text style={S.heroIcon}>✅</Text>
          <Heading style={S.heroHeading}>HOZZÁFÉRÉS <span style={S.heroAccent}>AKTIVÁLVA</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>
            Sikeresen beléptél a könyvelői központba. Mostantól bármikor megnézheted a havi számlákat, ÁFA-bontást és letöltheted az exportokat CSV / XLSX / NAV XML formátumban.
          </Text>
          {portal_url && (
            <Section style={S.buttonContainer}>
              <Button href={portal_url} style={S.button}>KÖNYVELŐI KÖZPONT MEGNYITÁSA</Button>
            </Section>
          )}
          <Text style={S.textSmall}>
            Javaslat: kapcsold be a kétlépcsős hitelesítést (TOTP) a profilban a magasabb védelemért.
          </Text>
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{S.SITE_NAME}</Text>
          <Text style={S.footerText}>Csak olvasás · GDPR-konform audit napló</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountantWelcome,
  subject: 'Könyvelői hozzáférésed aktív 🖤',
  displayName: 'Könyvelő üdvözlő',
  previewData: { portal_url: 'https://example.com/konyvelo' },
} satisfies TemplateEntry

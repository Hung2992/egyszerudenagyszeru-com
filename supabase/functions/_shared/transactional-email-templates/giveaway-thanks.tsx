/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

const GiveawayThanksEmail = () => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Bekerültél a sorsolókerékbe! — {S.SITE_NAME}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>EGYSZERŰ <span style={S.brandTitleAccent}>DE</span> NAGYSZERŰ</Heading>
          <Text style={S.brandTagline}>Streetwear collective • Est. 2024</Text>
        </Section>
        <Container style={S.container}>
          <Text style={S.heroIcon}>🎡</Text>
          <Heading style={S.heroHeading}>BEKERÜLTÉL A <span style={S.heroAccent}>JÁTÉKBA</span></Heading>
          <Section style={S.goldDivider} />
          <Text style={S.text}>
            Az e-mail címed regisztráltuk a <strong style={{ color: S.COLORS.text }}>{S.SITE_NAME}</strong> nyereményjátékára.
          </Text>
          <Text style={S.text}>
            A sorsolás zárása után véletlenszerűen választunk 1 nyertest. Ha Te leszel a szerencsés, e-mailben értesítünk!
          </Text>
          <Section style={S.buttonContainer}>
            <Button href={`${S.SITE_URL}/shop`} style={S.button}>BÖNGÉSSZ ADDIG IS</Button>
          </Section>
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
  component: GiveawayThanksEmail,
  subject: 'Bekerültél a sorsolókerékbe! 🎡',
  displayName: 'Nyereményjáték feliratkozás megerősítés',
  previewData: {},
} satisfies TemplateEntry

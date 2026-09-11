/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as S from './_shared-styles.ts'

interface Item { title?: string; text?: string }
interface Props {
  brand_name?: string
  heading?: string
  intro?: string
  items?: Item[]
  cta_url?: string
  cta_label?: string
  footer_note?: string
  preview_text?: string
}

const Newsletter = ({
  brand_name,
  heading,
  intro,
  items,
  cta_url,
  cta_label,
  footer_note,
  preview_text,
}: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>{preview_text || heading || 'Hírlevél'}</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.goldLine} />
        <Section style={S.header}>
          <Heading style={S.brandTitle}>{brand_name || 'EGYSZERŰ DE NAGYSZERŰ'}</Heading>
          <Text style={S.brandTagline}>Hírlevél</Text>
        </Section>
        <Container style={S.container}>
          <Heading style={S.heroHeading}>{heading || 'ÚJDONSÁGOK'}</Heading>
          <Section style={S.goldDivider} />
          {intro && <Text style={S.text}>{intro}</Text>}
          {(items || []).map((item, i) => (
            <Text key={i} style={S.text}>
              {item.title && <strong>{item.title}</strong>}
              {item.title && item.text ? ' — ' : ''}
              {item.text}
            </Text>
          ))}
          {cta_url && (
            <Section style={S.buttonContainer}>
              <Button href={cta_url} style={S.button}>{cta_label || 'MEGNÉZEM'}</Button>
            </Section>
          )}
          {footer_note && <Text style={S.text}>{footer_note}</Text>}
        </Container>
        <Section style={S.footerSection}>
          <Text style={S.footerBrand}>{brand_name || S.SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Newsletter,
  subject: (data: Record<string, any>) => data?.subject || data?.heading || 'Hírlevél',
  displayName: 'Hírlevél (általános)',
  previewData: {
    brand_name: 'Egyszerű de Nagyszerű',
    heading: 'ŐSZI ÚJDONSÁGOK',
    intro: 'Ezek a legfrissebb híreink.',
    items: [{ title: 'Új termékek', text: '12 új tétel érkezett.' }],
    cta_url: 'https://example.com',
    cta_label: 'MEGNÉZEM',
  },
} satisfies TemplateEntry

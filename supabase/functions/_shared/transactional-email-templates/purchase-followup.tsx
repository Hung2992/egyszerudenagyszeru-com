import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  order_id?: string
  total?: number
}

const Email = ({ name, order_id, total }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Köszönjük a rendelésed – hogy tetszett?</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Köszönjük a rendelésed!</Heading>
        <Text style={text}>{name ? `Szia ${name}!` : 'Szia!'}</Text>
        <Text style={text}>
          Egy napja leadtad a rendelésed
          {total ? ` (${Number(total).toLocaleString('hu-HU')} Ft értékben)` : ''}. Reméljük, minden
          rendben ment. Ha kérdésed van, csak válaszolj erre az emailre.
        </Text>
        <Button style={button} href="https://www.egyszerudenagyszeru.com/shop">
          Nézz körül újra
        </Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Köszönjük a rendelésed! 🖤',
  displayName: 'Vásárlás utáni követő',
  previewData: { name: 'János', total: 12990 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { fontSize: '22px', color: '#111111' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#333333' }
const button = {
  backgroundColor: '#111111',
  color: '#ffffff',
  padding: '12px 24px',
  fontSize: '14px',
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '12px',
}

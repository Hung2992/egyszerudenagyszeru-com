import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
}

const Email = ({ name }: Props) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Otthagytál valamit a kosaradban</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Otthagytál valamit a kosaradban 🛒</Heading>
        <Text style={text}>{name ? `Szia ${name}!` : 'Szia!'}</Text>
        <Text style={text}>
          Nemrég termékeket tettél a kosaradba, de a rendelés nem fejeződött be. A kosarad
          megőriztük – egy kattintással folytathatod.
        </Text>
        <Button style={button} href="https://www.egyszerudenagyszeru.com/cart">
          Vissza a kosárhoz
        </Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Otthagytál valamit a kosaradban 🛒',
  displayName: 'Elhagyott kosár emlékeztető',
  previewData: { name: 'János' },
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

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Egyszer de Nagyszeru"

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="hu" dir="ltr">
    <Head />
    <Preview>Üdvözlünk a {SITE_NAME}-nél! 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Üdvözlünk, ${name}!` : 'Üdvözlünk!'}
        </Heading>
        <Text style={text}>
          Köszönjük, hogy regisztráltál a {SITE_NAME} webshopban! Mostantól hozzáférsz az exkluzív ajánlatainkhoz, nyomon követheted a rendeléseidet és feliratkozhatsz az értesítéseinkre.
        </Text>
        <Text style={text}>
          Nézd meg a legújabb kollekcióinkat és találd meg a stílusodhoz illő darabokat.
        </Text>
        <Button href="https://egyszerudenagyszeru.com/shop" style={button}>
          BÖNGÉSSZ A BOLTBAN
        </Button>
        <Text style={footer}>Üdvözlettel, {SITE_NAME} csapata</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Üdvözlünk a csapatban! 🎉',
  displayName: 'Üdvözlő e-mail',
  previewData: { name: 'Márk' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const button = { backgroundColor: '#000000', color: '#ffffff', padding: '14px 28px', fontSize: '12px', fontWeight: 'bold' as const, letterSpacing: '0.1em', textDecoration: 'none', display: 'inline-block' as const, borderRadius: '0px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

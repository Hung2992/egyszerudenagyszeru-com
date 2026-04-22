// Shared dark theme styles for all transactional emails
// Brand: Egyszerű de Nagyszerű — dark streetwear aesthetic
// Black background, white text, gold (#c9a84c) accents

export const SITE_NAME = "Egyszerű de Nagyszerű"
export const SITE_URL = "https://egyszerudenagyszeru.com"
export const FONT = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif"

export const COLORS = {
  bg: '#0a0a0a',
  bgDeep: '#000000',
  surface: '#141414',
  surfaceAlt: '#1a1a1a',
  border: '#2a2a2a',
  borderGold: '#c9a84c',
  gold: '#c9a84c',
  goldDim: '#8a7233',
  text: '#ffffff',
  textMuted: '#b8b8b8',
  textDim: '#7a7a7a',
}

// Body / outermost wrapper — must remain white for inbox renderers
export const main = {
  backgroundColor: '#ffffff',
  fontFamily: FONT,
  padding: '0',
  margin: '0',
}

// Inner wrapper — the actual visual "card" (DARK)
export const wrapper = {
  backgroundColor: COLORS.bg,
  maxWidth: '600px',
  margin: '0 auto',
  border: `1px solid ${COLORS.border}`,
}

// Top gold accent line
export const goldLine = {
  backgroundColor: COLORS.gold,
  height: '4px',
  width: '100%',
  fontSize: '0',
  lineHeight: '0',
}

// Header (brand block)
export const header = {
  backgroundColor: COLORS.bg,
  padding: '32px 32px 24px',
  borderBottom: `1px solid ${COLORS.border}`,
}

export const brandTitle = {
  color: COLORS.text,
  fontSize: '28px',
  fontWeight: '900' as const,
  letterSpacing: '0.02em',
  textTransform: 'uppercase' as const,
  margin: '0',
  fontFamily: FONT,
  lineHeight: '1.1',
}

export const brandTitleAccent = {
  color: COLORS.gold,
}

export const brandTagline = {
  color: COLORS.textDim,
  fontSize: '11px',
  letterSpacing: '0.25em',
  textTransform: 'uppercase' as const,
  margin: '8px 0 0',
  fontFamily: FONT,
}

// Content container
export const container = {
  padding: '40px 32px 32px',
  backgroundColor: COLORS.bg,
}

// Greeting line
export const greeting = {
  color: COLORS.textMuted,
  fontSize: '15px',
  margin: '0 0 32px',
  fontFamily: FONT,
}

// Big hero icon (emoji centered)
export const heroIcon = {
  fontSize: '64px',
  textAlign: 'center' as const,
  margin: '8px 0 16px',
  lineHeight: '1',
}

// Hero headline
export const heroHeading = {
  fontSize: '32px',
  fontWeight: '900' as const,
  color: COLORS.text,
  margin: '0 0 16px',
  fontFamily: FONT,
  lineHeight: '1.15',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.01em',
}

export const heroAccent = {
  color: COLORS.gold,
}

// Gold underline divider (short, centered)
export const goldDivider = {
  backgroundColor: COLORS.gold,
  height: '3px',
  width: '80px',
  margin: '0 auto 28px',
  fontSize: '0',
  lineHeight: '0',
}

// Body paragraph
export const text = {
  fontSize: '15px',
  color: COLORS.textMuted,
  lineHeight: '1.7',
  margin: '0 0 20px',
  fontFamily: FONT,
  textAlign: 'center' as const,
}

export const textLeft = {
  ...text,
  textAlign: 'left' as const,
}

export const textSmall = {
  fontSize: '12px',
  color: COLORS.textDim,
  lineHeight: '1.6',
  margin: '0',
  fontFamily: FONT,
  textAlign: 'center' as const,
}

// Info / detail card (gold-bordered)
export const infoCard = {
  backgroundColor: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderLeft: `3px solid ${COLORS.gold}`,
  padding: '20px 24px',
  margin: '24px 0',
}

export const infoLabel = {
  color: COLORS.textDim,
  fontSize: '11px',
  fontWeight: '700' as const,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
  fontFamily: FONT,
}

export const infoValue = {
  color: COLORS.text,
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
  fontFamily: FONT,
}

export const infoValueGold = {
  color: COLORS.gold,
  fontSize: '20px',
  fontWeight: '700' as const,
  margin: '0',
  fontFamily: FONT,
}

// Code / order number block (centered, all gold)
export const codeBlock = {
  backgroundColor: COLORS.surface,
  border: `1px dashed ${COLORS.gold}`,
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

export const codeLabel = {
  color: COLORS.textDim,
  fontSize: '11px',
  fontWeight: '700' as const,
  letterSpacing: '0.25em',
  textTransform: 'uppercase' as const,
  margin: '0 0 10px',
  fontFamily: FONT,
}

export const codeValue = {
  color: COLORS.gold,
  fontSize: '28px',
  fontWeight: '900' as const,
  letterSpacing: '0.15em',
  margin: '0',
  fontFamily: FONT,
}

// Primary button (gold border, gold text on dark)
export const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0 24px',
}

export const button = {
  backgroundColor: 'transparent',
  color: COLORS.gold,
  padding: '16px 44px',
  fontSize: '12px',
  fontWeight: '700' as const,
  letterSpacing: '0.2em',
  textDecoration: 'none',
  display: 'inline-block' as const,
  borderRadius: '0px',
  fontFamily: FONT,
  border: `2px solid ${COLORS.gold}`,
  textTransform: 'uppercase' as const,
}

export const buttonSolid = {
  ...button,
  backgroundColor: COLORS.gold,
  color: COLORS.bg,
}

// Divider
export const hr = {
  borderColor: COLORS.border,
  borderTop: `1px solid ${COLORS.border}`,
  margin: '28px 0',
}

// Footer
export const footerSection = {
  backgroundColor: COLORS.bgDeep,
  padding: '28px 32px',
  textAlign: 'center' as const,
  borderTop: `1px solid ${COLORS.border}`,
}

export const footerBrand = {
  color: COLORS.gold,
  fontSize: '13px',
  fontWeight: '700' as const,
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
  fontFamily: FONT,
}

export const footerText = {
  color: COLORS.textDim,
  fontSize: '11px',
  margin: '0',
  letterSpacing: '0.08em',
  fontFamily: FONT,
}

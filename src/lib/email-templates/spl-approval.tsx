import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Hiren Kundli'

interface SplApprovalProps {
  uid?: string
  name?: string
}

const SplApprovalEmail = ({ uid, name }: SplApprovalProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Silver Prime Lite application has been approved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Welcome, ${name}` : 'Your application is approved'}</Heading>
        <Text style={text}>
          Your Silver Prime Lite (SPL) application with {SITE_NAME} has been reviewed and approved.
          Below is your unique session ID. Please share this exact ID when contacted on WhatsApp to begin your session.
        </Text>
        <Section style={uidBox}>
          <Text style={uidLabel}>Your UID</Text>
          <Text style={uidValue}>{uid ?? 'HK-SPL-XXXXXXXX-XXXX'}</Text>
        </Section>
        <Text style={text}>
          What happens next:
        </Text>
        <Text style={listItem}>• We will reach out on your WhatsApp number within 24 hours</Text>
        <Text style={listItem}>• Your 20 minute SPL session covers Experience and a focused Orientation read</Text>
        <Text style={listItem}>• Keep this UID for any future reference or status check</Text>
        <Text style={footer}>
          Calm. Structured. Pattern-first.<br />
          The {SITE_NAME} team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SplApprovalEmail,
  subject: 'Your SPL application is approved — Hiren Kundli',
  displayName: 'SPL approval',
  previewData: { uid: 'HK-SPL-19900101-A1B2', name: 'Aanya' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0B0B0F' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0B0B0F', margin: '0 0 18px' }
const text = { fontSize: '14px', color: '#3a3a44', lineHeight: '1.6', margin: '0 0 16px' }
const listItem = { fontSize: '14px', color: '#3a3a44', lineHeight: '1.6', margin: '0 0 8px' }
const uidBox = { backgroundColor: '#1A0F2E', borderRadius: '14px', padding: '20px 22px', margin: '20px 0 26px', textAlign: 'center' as const, border: '1px solid #D4AF37' }
const uidLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: '#D4AF37', margin: '0 0 8px', fontWeight: 600 }
const uidValue = { fontSize: '20px', color: '#ffffff', fontFamily: 'monospace', letterSpacing: '0.05em', margin: 0, fontWeight: 600 }
const footer = { fontSize: '12px', color: '#888', margin: '34px 0 0', lineHeight: '1.6' }

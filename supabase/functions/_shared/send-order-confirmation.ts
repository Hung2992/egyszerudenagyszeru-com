import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as orderConfirmationTemplate } from './transactional-email-templates/order-confirmation.tsx'

const SITE_NAME = 'strong-easy-shop'
const SENDER_DOMAIN = 'notify.egyszerudenagyszeru.com'
const FROM_DOMAIN = 'egyszerudenagyszeru.com'

interface SendOrderConfirmationParams {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  recipientEmail: string | null | undefined
  orderId: string
  customerName?: string | null
  totalAmount?: number | null
  itemCount?: number
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function getOrCreateUnsubscribeToken(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string> {
  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', email)
    .maybeSingle()

  if (tokenLookupError) {
    throw new Error(`Failed to look up unsubscribe token: ${tokenLookupError.message}`)
  }

  if (existingToken && !existingToken.used_at) {
    return existingToken.token
  }

  if (existingToken?.used_at) {
    throw new Error('Recipient has already unsubscribed from app emails')
  }

  const token = generateToken()
  const { error: tokenError } = await supabase
    .from('email_unsubscribe_tokens')
    .upsert({ token, email }, { onConflict: 'email', ignoreDuplicates: true })

  if (tokenError) {
    throw new Error(`Failed to create unsubscribe token: ${tokenError.message}`)
  }

  const { data: storedToken, error: storedTokenError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', email)
    .maybeSingle()

  if (storedTokenError || !storedToken) {
    throw new Error(
      `Failed to confirm unsubscribe token: ${storedTokenError?.message ?? 'token missing after upsert'}`,
    )
  }

  if (storedToken.used_at) {
    throw new Error('Recipient has already unsubscribed from app emails')
  }

  return storedToken.token
}

export function getOrderItemCount(items: unknown): number {
  if (!Array.isArray(items)) return 0

  return items.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum + 1

    const quantity = Number((item as { quantity?: unknown }).quantity)
    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1)
  }, 0)
}

export async function sendOrderConfirmationEmail({
  supabaseUrl,
  supabaseServiceRoleKey,
  recipientEmail,
  orderId,
  customerName,
  totalAmount,
  itemCount,
}: SendOrderConfirmationParams): Promise<void> {
  const normalizedEmail = recipientEmail?.trim()
  if (!normalizedEmail) return

  const normalizedServiceRoleKey = supabaseServiceRoleKey?.trim()
  if (!supabaseUrl?.trim() || !normalizedServiceRoleKey) {
    throw new Error('Missing backend configuration for order confirmation email')
  }

  const supabase = createClient(supabaseUrl, normalizedServiceRoleKey)
  const normalizedLowercaseEmail = normalizedEmail.toLowerCase()

  const { data: suppressedEmail, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedLowercaseEmail)
    .maybeSingle()

  if (suppressionError) {
    throw new Error(`Failed to verify suppression status: ${suppressionError.message}`)
  }

  if (suppressedEmail) {
    return
  }

  const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, normalizedLowercaseEmail)

  const templateData = {
    name: customerName ?? undefined,
    totalAmount:
      typeof totalAmount === 'number' && Number.isFinite(totalAmount)
        ? totalAmount.toLocaleString('hu-HU')
        : undefined,
    itemCount: itemCount && itemCount > 0 ? itemCount : undefined,
  }

  const html = await renderAsync(
    React.createElement(orderConfirmationTemplate.component, templateData),
  )
  const text = await renderAsync(
    React.createElement(orderConfirmationTemplate.component, templateData),
    { plainText: true },
  )
  const subject =
    typeof orderConfirmationTemplate.subject === 'function'
      ? orderConfirmationTemplate.subject(templateData)
      : orderConfirmationTemplate.subject
  const messageId = crypto.randomUUID()

  const { error: pendingLogError } = await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'order-confirmation',
    recipient_email: normalizedEmail,
    status: 'pending',
  })

  if (pendingLogError) {
    throw new Error(`Failed to create email log entry: ${pendingLogError.message}`)
  }

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: normalizedEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: 'order-confirmation',
      idempotency_key: `order-confirm-${orderId}`,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'order-confirmation',
      recipient_email: normalizedEmail,
      status: 'failed',
      error_message: `Failed to enqueue email: ${enqueueError.message}`,
    })

    throw new Error(`Failed to enqueue order confirmation email: ${enqueueError.message}`)
  }
}
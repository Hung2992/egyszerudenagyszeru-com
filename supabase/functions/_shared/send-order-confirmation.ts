interface SendOrderConfirmationParams {
  supabaseUrl: string
  functionAuthKey: string
  recipientEmail: string | null | undefined
  orderId: string
  customerName?: string | null
  totalAmount?: number | null
  itemCount?: number
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
  functionAuthKey,
  recipientEmail,
  orderId,
  customerName,
  totalAmount,
  itemCount,
}: SendOrderConfirmationParams): Promise<void> {
  const normalizedEmail = recipientEmail?.trim()
  if (!normalizedEmail) return

  const normalizedAuthKey = functionAuthKey?.trim()
  if (!normalizedAuthKey || normalizedAuthKey.split('.').length !== 3) {
    throw new Error('Order confirmation email auth token must be a JWT anon key')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${normalizedAuthKey}`,
      apikey: normalizedAuthKey,
    },
    body: JSON.stringify({
      templateName: 'order-confirmation',
      recipientEmail: normalizedEmail,
      idempotencyKey: `order-confirm-${orderId}`,
      templateData: {
        name: customerName ?? undefined,
        totalAmount:
          typeof totalAmount === 'number' && Number.isFinite(totalAmount)
            ? totalAmount.toLocaleString('hu-HU')
            : undefined,
        itemCount: itemCount && itemCount > 0 ? itemCount : undefined,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Order confirmation email failed: ${response.status} ${errorText}`)
  }
}
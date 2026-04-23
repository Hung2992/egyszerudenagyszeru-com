interface SendAppEmailParams {
  templateName: string;
  recipientEmail?: string | null;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}

interface SendAppEmailResponse {
  success?: boolean;
  queued?: boolean;
  reason?: string;
  error?: string;
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function sendAppEmail({
  templateName,
  recipientEmail,
  idempotencyKey,
  templateData,
}: SendAppEmailParams): Promise<SendAppEmailResponse> {
  const response = await fetch(`${FUNCTIONS_URL}/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      templateName,
      recipientEmail: recipientEmail ?? undefined,
      idempotencyKey,
      templateData,
    }),
  });

  let data: SendAppEmailResponse | null = null;

  try {
    data = (await response.json()) as SendAppEmailResponse;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `Az e-mail küldése nem sikerült (${response.status}).`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (data?.success === false && data.reason && data.reason !== "email_suppressed") {
    throw new Error(data.reason);
  }

  return data ?? {};
}

import { supabase } from "@/integrations/supabase/untyped-client";

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

export async function sendAppEmail({
  templateName,
  recipientEmail,
  idempotencyKey,
  templateData,
}: SendAppEmailParams): Promise<SendAppEmailResponse> {
  const { data, error } = await supabase.functions.invoke<SendAppEmailResponse>(
    "send-transactional-email",
    {
      body: {
        templateName,
        recipientEmail: recipientEmail ?? undefined,
        idempotencyKey,
        templateData,
      },
    }
  );

  if (error) {
    throw new Error(error.message || "Az e-mail küldése nem sikerült.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (data?.success === false && data.reason && data.reason !== "email_suppressed") {
    throw new Error(data.reason);
  }

  return data ?? {};
}
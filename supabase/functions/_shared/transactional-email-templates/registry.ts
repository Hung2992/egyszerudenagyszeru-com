/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as welcome } from './welcome.tsx'
import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as shippingNotification } from './shipping-notification.tsx'
import { template as deliveryConfirmation } from './delivery-confirmation.tsx'
import { template as giveawayWinner } from './giveaway-winner.tsx'
import { template as giveawayThanks } from './giveaway-thanks.tsx'
import { template as couponNotification } from './coupon-notification.tsx'
import { template as paymentConfirmation } from './payment-confirmation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-confirmation': contactConfirmation,
  'welcome': welcome,
  'order-confirmation': orderConfirmation,
  'shipping-notification': shippingNotification,
  'delivery-confirmation': deliveryConfirmation,
  'giveaway-winner': giveawayWinner,
  'giveaway-thanks': giveawayThanks,
  'coupon-notification': couponNotification,
  'payment-confirmation': paymentConfirmation,
}

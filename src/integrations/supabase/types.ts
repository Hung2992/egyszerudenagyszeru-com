export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_bank_cards: {
        Row: {
          bank_name: string | null
          card_last4: string
          card_name: string
          card_type: string | null
          created_at: string | null
          expiry_month: number | null
          expiry_year: number | null
          holder_name: string | null
          iban: string | null
          id: string
          is_default: boolean | null
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          card_last4?: string
          card_name?: string
          card_type?: string | null
          created_at?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          holder_name?: string | null
          iban?: string | null
          id?: string
          is_default?: boolean | null
          user_id: string
        }
        Update: {
          bank_name?: string | null
          card_last4?: string
          card_name?: string
          card_type?: string | null
          created_at?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          holder_name?: string | null
          iban?: string | null
          id?: string
          is_default?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      admin_procurement_orders: {
        Row: {
          actual_arrival: string | null
          category: string | null
          created_at: string
          currency: string | null
          expected_arrival: string | null
          id: string
          linked_order_id: string | null
          linked_product_id: string | null
          margin_percent: number | null
          notes: string | null
          order_status: string
          payment_method: string | null
          payment_status: string
          priority: string
          product_name: string
          product_sku: string | null
          profit_amount: number | null
          quantity: number
          selling_price: number
          status: string | null
          supplier_name: string | null
          supplier_url: string | null
          total_cost: number | null
          tracking_number: string | null
          unit_cost: number
        }
        Insert: {
          actual_arrival?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          expected_arrival?: string | null
          id?: string
          linked_order_id?: string | null
          linked_product_id?: string | null
          margin_percent?: number | null
          notes?: string | null
          order_status?: string
          payment_method?: string | null
          payment_status?: string
          priority?: string
          product_name: string
          product_sku?: string | null
          profit_amount?: number | null
          quantity?: number
          selling_price?: number
          status?: string | null
          supplier_name?: string | null
          supplier_url?: string | null
          total_cost?: number | null
          tracking_number?: string | null
          unit_cost?: number
        }
        Update: {
          actual_arrival?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          expected_arrival?: string | null
          id?: string
          linked_order_id?: string | null
          linked_product_id?: string | null
          margin_percent?: number | null
          notes?: string | null
          order_status?: string
          payment_method?: string | null
          payment_status?: string
          priority?: string
          product_name?: string
          product_sku?: string | null
          profit_amount?: number | null
          quantity?: number
          selling_price?: number
          status?: string | null
          supplier_name?: string | null
          supplier_url?: string | null
          total_cost?: number | null
          tracking_number?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_procurement_orders_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_procurement_orders_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_transactions: {
        Row: {
          amount: number
          card_id: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          fee: number | null
          id: string
          method: string | null
          net_amount: number
          reference_id: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          card_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee?: number | null
          id?: string
          method?: string | null
          net_amount?: number
          reference_id?: string | null
          status?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee?: number | null
          id?: string
          method?: string | null
          net_amount?: number
          reference_id?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "admin_bank_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_procurement_log: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          ordered_quantity: number
          procurement_order_id: string | null
          product_id: string | null
          product_name: string
          status: string
          threshold: number
          trigger_stock: number
          velocity_per_day: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          ordered_quantity: number
          procurement_order_id?: string | null
          product_id?: string | null
          product_name: string
          status?: string
          threshold: number
          trigger_stock: number
          velocity_per_day?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          ordered_quantity?: number
          procurement_order_id?: string | null
          product_id?: string | null
          product_name?: string
          status?: string
          threshold?: number
          trigger_stock?: number
          velocity_per_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_procurement_log_procurement_order_id_fkey"
            columns: ["procurement_order_id"]
            isOneToOne: false
            referencedRelation: "admin_procurement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_procurement_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      early_access_codes: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          email: string
          id: string
          product_id: string
          used_at: string | null
          used_order_id: string | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent?: number
          email: string
          id?: string
          product_id: string
          used_at?: string | null
          used_order_id?: string | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          email?: string
          id?: string
          product_id?: string
          used_at?: string | null
          used_order_id?: string | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      fraud_signals: {
        Row: {
          ai_reasoning: string | null
          created_at: string
          id: string
          order_id: string
          review_outcome: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          risk_score: number
          signals: Json
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string
          id?: string
          order_id: string
          review_outcome?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          risk_score?: number
          signals?: Json
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string
          id?: string
          order_id?: string
          review_outcome?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          risk_score?: number
          signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fraud_signals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaway_entries: {
        Row: {
          created_at: string
          email: string
          id: string
          is_winner: boolean
          prize_claimed: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_winner?: boolean
          prize_claimed?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_winner?: boolean
          prize_claimed?: boolean
        }
        Relationships: []
      }
      giveaway_prizes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "giveaway_prizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaway_settings: {
        Row: {
          end_date: string | null
          id: number
          is_enabled: boolean
          start_date: string | null
          updated_at: string
        }
        Insert: {
          end_date?: string | null
          id?: number
          is_enabled?: boolean
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          end_date?: string | null
          id?: number
          is_enabled?: boolean
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      homepage_banners: {
        Row: {
          button_text: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string
        }
        Insert: {
          button_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          button_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          currency: string
          customer_address: string | null
          customer_city: string | null
          customer_email: string
          customer_name: string
          customer_tax_number: string | null
          customer_zip: string | null
          discount_amount: number
          id: string
          invoice_number: string
          items: Json
          notes: string | null
          order_id: string
          paid_at: string | null
          payment_method: string | null
          pdf_url: string | null
          shipping_amount: number
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_email: string
          customer_name: string
          customer_tax_number?: string | null
          customer_zip?: string | null
          discount_amount?: number
          id?: string
          invoice_number: string
          items?: Json
          notes?: string | null
          order_id: string
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          shipping_amount?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_email?: string
          customer_name?: string
          customer_tax_number?: string | null
          customer_zip?: string | null
          discount_amount?: number
          id?: string
          invoice_number?: string
          items?: Json
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          shipping_amount?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      launch_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          interested_product_id: string | null
          notified_at: string | null
          share_code: string | null
          shares_count: number | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          interested_product_id?: string | null
          notified_at?: string | null
          share_code?: string | null
          shares_count?: number | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          interested_product_id?: string | null
          notified_at?: string | null
          share_code?: string | null
          shares_count?: number | null
          source?: string | null
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          new_status: string | null
          order_id: string
          previous_status: string | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          order_id: string
          previous_status?: string | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          order_id?: string
          previous_status?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer_email: string
          discount_amount: number | null
          id: string
          items: Json | null
          notes: string | null
          payment_method: string | null
          procurement_status: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_name: string | null
          shipping_phone: string | null
          shipping_zip: string | null
          status: string
          total_amount: number
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer_email: string
          discount_amount?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          payment_method?: string | null
          procurement_status?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_zip?: string | null
          status?: string
          total_amount?: number
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          discount_amount?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          payment_method?: string | null
          procurement_status?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_zip?: string | null
          status?: string
          total_amount?: number
          user_id?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          page: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          page: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          page?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          amount: number
          attempt_number: number
          completed_at: string | null
          created_at: string
          currency: string | null
          error_code: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          order_id: string
          payment_method: string | null
          provider: string | null
          provider_intent_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          payment_method?: string | null
          provider?: string | null
          provider_intent_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_method?: string | null
          provider?: string | null
          provider_intent_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          failed_reason: string | null
          fee: number | null
          id: string
          net_amount: number
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          failed_reason?: string | null
          fee?: number | null
          id?: string
          net_amount?: number
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          failed_reason?: string | null
          fee?: number | null
          id?: string
          net_amount?: number
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_polls: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          vote_weight: number
          voter_email: string
          voter_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          vote_weight?: number
          voter_email: string
          voter_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          vote_weight?: number
          voter_email?: string
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_polls_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_preorders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          deposit_amount: number
          id: string
          notes: string | null
          notified_at: string | null
          payment_intent_id: string | null
          product_id: string
          quantity: number
          selected_color: string | null
          selected_size: string | null
          status: string
          total_amount: number
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          deposit_amount?: number
          id?: string
          notes?: string | null
          notified_at?: string | null
          payment_intent_id?: string | null
          product_id: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          status?: string
          total_amount?: number
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          deposit_amount?: number
          id?: string
          notes?: string | null
          notified_at?: string | null
          payment_intent_id?: string | null
          product_id?: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          status?: string
          total_amount?: number
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_preorders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_preorders_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          admin_reply: string | null
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          title: string | null
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating?: number
          title?: string | null
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_size_chart: {
        Row: {
          chest_cm: number | null
          created_at: string
          extra_measurements: Json | null
          hip_cm: number | null
          id: string
          inseam_cm: number | null
          length_cm: number | null
          product_id: string
          shoulder_cm: number | null
          size: string
          sleeve_cm: number | null
          sort_order: number
          waist_cm: number | null
        }
        Insert: {
          chest_cm?: number | null
          created_at?: string
          extra_measurements?: Json | null
          hip_cm?: number | null
          id?: string
          inseam_cm?: number | null
          length_cm?: number | null
          product_id: string
          shoulder_cm?: number | null
          size: string
          sleeve_cm?: number | null
          sort_order?: number
          waist_cm?: number | null
        }
        Update: {
          chest_cm?: number | null
          created_at?: string
          extra_measurements?: Json | null
          hip_cm?: number | null
          id?: string
          inseam_cm?: number | null
          length_cm?: number | null
          product_id?: string
          shoulder_cm?: number | null
          size?: string
          sleeve_cm?: number | null
          sort_order?: number
          waist_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_size_chart_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          preorder_count: number
          preorder_enabled: boolean
          preorder_limit: number | null
          price_modifier: number
          product_id: string
          size: string | null
          sku: string | null
          sort_order: number
          stock: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          preorder_count?: number
          preorder_enabled?: boolean
          preorder_limit?: number | null
          price_modifier?: number
          product_id: string
          size?: string | null
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          preorder_count?: number
          preorder_enabled?: boolean
          preorder_limit?: number | null
          price_modifier?: number
          product_id?: string
          size?: string | null
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_waitlist: {
        Row: {
          boost_position: number | null
          converted_at: string | null
          created_at: string
          early_access: boolean
          early_access_code: string | null
          email: string
          id: string
          name: string | null
          notified_at: string | null
          position: number | null
          product_id: string
          share_code: string | null
          shares_count: number | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          boost_position?: number | null
          converted_at?: string | null
          created_at?: string
          early_access?: boolean
          early_access_code?: string | null
          email: string
          id?: string
          name?: string | null
          notified_at?: string | null
          position?: number | null
          product_id: string
          share_code?: string | null
          shares_count?: number | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          boost_position?: number | null
          converted_at?: string | null
          created_at?: string
          early_access?: boolean
          early_access_code?: string | null
          email?: string
          id?: string
          name?: string | null
          notified_at?: string | null
          position?: number | null
          product_id?: string
          share_code?: string | null
          shares_count?: number | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_waitlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          preferred_payment: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          preferred_payment?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          preferred_payment?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          applicable_categories: string[] | null
          created_at: string
          description: string | null
          discount_value: number
          id: string
          is_active: boolean
          min_order_amount: number
          min_quantity: number
          name: string
          promo_type: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          created_at?: string
          description?: string | null
          discount_value?: number
          id?: string
          is_active?: boolean
          min_order_amount?: number
          min_quantity?: number
          name: string
          promo_type?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          created_at?: string
          description?: string | null
          discount_value?: number
          id?: string
          is_active?: boolean
          min_order_amount?: number
          min_quantity?: number
          name?: string
          promo_type?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      refund_history: {
        Row: {
          action_type: string
          amount: number | null
          card_last4: string | null
          created_at: string
          id: string
          method: string | null
          new_status: string | null
          notes: string | null
          performed_by: string | null
          previous_status: string | null
          return_request_id: string
          transaction_id: string | null
        }
        Insert: {
          action_type?: string
          amount?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          method?: string | null
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          previous_status?: string | null
          return_request_id: string
          transaction_id?: string | null
        }
        Update: {
          action_type?: string
          amount?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          method?: string | null
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          previous_status?: string | null
          return_request_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_history_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          bank_details: Json | null
          created_at: string | null
          currency: string | null
          customer_name: string
          id: string
          method: string | null
          notes: string | null
          order_id: string | null
          reason: string | null
          status: string | null
        }
        Insert: {
          amount?: number
          bank_details?: Json | null
          created_at?: string | null
          currency?: string | null
          customer_name?: string
          id?: string
          method?: string | null
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          bank_details?: Json | null
          created_at?: string | null
          currency?: string | null
          customer_name?: string
          id?: string
          method?: string | null
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      return_preferences: {
        Row: {
          auto_label: boolean | null
          created_at: string
          default_reason: string | null
          id: string
          pickup_address: string | null
          preferred_method: string | null
          preferred_refund_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_label?: boolean | null
          created_at?: string
          default_reason?: string | null
          id?: string
          pickup_address?: string | null
          preferred_method?: string | null
          preferred_refund_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_label?: boolean | null
          created_at?: string
          default_reason?: string | null
          id?: string
          pickup_address?: string | null
          preferred_method?: string | null
          preferred_refund_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          admin_notes: string | null
          bank_card_last4: string | null
          created_at: string
          description: string | null
          exchange_product_id: string | null
          id: string
          order_id: string
          preferred_refund_method: string | null
          reason: string
          refund_amount: number
          refund_notes: string | null
          refund_processed_at: string | null
          refund_status: string
          refund_transaction_id: string | null
          request_type: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          bank_card_last4?: string | null
          created_at?: string
          description?: string | null
          exchange_product_id?: string | null
          id?: string
          order_id: string
          preferred_refund_method?: string | null
          reason: string
          refund_amount?: number
          refund_notes?: string | null
          refund_processed_at?: string | null
          refund_status?: string
          refund_transaction_id?: string | null
          request_type?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          bank_card_last4?: string | null
          created_at?: string
          description?: string | null
          exchange_product_id?: string | null
          id?: string
          order_id?: string
          preferred_refund_method?: string | null
          reason?: string
          refund_amount?: number
          refund_notes?: string | null
          refund_processed_at?: string | null
          refund_status?: string
          refund_transaction_id?: string | null
          request_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          auto_launch_enabled: boolean | null
          care_instructions: string | null
          category: string
          colors: string[] | null
          created_at: string
          description: string | null
          early_access_discount_percent: number | null
          early_access_enabled: boolean | null
          early_access_hours: number | null
          early_access_top_n: number | null
          featured_launch: boolean | null
          has_variants: boolean
          id: string
          image_url: string | null
          is_active: boolean
          is_sneak_peek: boolean
          launch_date: string | null
          launch_status: string
          launched_at: string | null
          manufacturer: string | null
          material: string | null
          name: string
          origin_country: string | null
          original_price: number | null
          poll_votes: number
          preorder_count: number
          preorder_deposit_percent: number
          preorder_enabled: boolean
          preorder_limit: number | null
          price: number
          share_count: number | null
          size_chart_type: string | null
          sizes: string[] | null
          stock: number
          teaser_description: string | null
          teaser_image_url: string | null
          waitlist_count: number
          weight_grams: number | null
        }
        Insert: {
          auto_launch_enabled?: boolean | null
          care_instructions?: string | null
          category?: string
          colors?: string[] | null
          created_at?: string
          description?: string | null
          early_access_discount_percent?: number | null
          early_access_enabled?: boolean | null
          early_access_hours?: number | null
          early_access_top_n?: number | null
          featured_launch?: boolean | null
          has_variants?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_sneak_peek?: boolean
          launch_date?: string | null
          launch_status?: string
          launched_at?: string | null
          manufacturer?: string | null
          material?: string | null
          name: string
          origin_country?: string | null
          original_price?: number | null
          poll_votes?: number
          preorder_count?: number
          preorder_deposit_percent?: number
          preorder_enabled?: boolean
          preorder_limit?: number | null
          price?: number
          share_count?: number | null
          size_chart_type?: string | null
          sizes?: string[] | null
          stock?: number
          teaser_description?: string | null
          teaser_image_url?: string | null
          waitlist_count?: number
          weight_grams?: number | null
        }
        Update: {
          auto_launch_enabled?: boolean | null
          care_instructions?: string | null
          category?: string
          colors?: string[] | null
          created_at?: string
          description?: string | null
          early_access_discount_percent?: number | null
          early_access_enabled?: boolean | null
          early_access_hours?: number | null
          early_access_top_n?: number | null
          featured_launch?: boolean | null
          has_variants?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_sneak_peek?: boolean
          launch_date?: string | null
          launch_status?: string
          launched_at?: string | null
          manufacturer?: string | null
          material?: string | null
          name?: string
          origin_country?: string | null
          original_price?: number | null
          poll_votes?: number
          preorder_count?: number
          preorder_deposit_percent?: number
          preorder_enabled?: boolean
          preorder_limit?: number | null
          price?: number
          share_count?: number | null
          size_chart_type?: string | null
          sizes?: string[] | null
          stock?: number
          teaser_description?: string | null
          teaser_image_url?: string | null
          waitlist_count?: number
          weight_grams?: number | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          analytics_custom_body_code: string | null
          analytics_custom_head_code: string | null
          analytics_enabled: boolean | null
          analytics_fb_conversions_token: string | null
          analytics_gtm_id: string | null
          analytics_meta_pixel_id: string | null
          analytics_tiktok_pixel_id: string | null
          appearance_announcement_bar_bg_color: string | null
          appearance_announcement_bar_enabled: boolean | null
          appearance_announcement_bar_text: string | null
          appearance_footer_style: string | null
          appearance_header_style: string | null
          appearance_product_card_style: string | null
          auto_hide_out_of_stock: boolean | null
          auto_procurement_default_supplier: string | null
          auto_procurement_default_supplier_url: string | null
          auto_procurement_enabled: boolean | null
          auto_procurement_max_qty: number | null
          auto_procurement_min_qty: number | null
          auto_procurement_notify_email: string | null
          auto_procurement_notify_enabled: boolean | null
          auto_procurement_threshold: number | null
          auto_procurement_use_velocity: boolean | null
          auto_procurement_velocity_days: number | null
          auto_reply_message: string | null
          business_hours: Json | null
          checkout_enable_gift_wrap: boolean | null
          checkout_enable_notes: boolean | null
          checkout_gift_wrap_price: number | null
          checkout_min_order_amount: number | null
          checkout_require_city: boolean | null
          checkout_require_phone: boolean | null
          checkout_require_zip: boolean | null
          checkout_success_message: string | null
          compare_enabled: boolean | null
          compare_max_products: number | null
          compare_show_differences_only: boolean | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          cookie_analytics_enabled: boolean | null
          cookie_banner_button_text: string | null
          cookie_banner_enabled: boolean | null
          cookie_banner_position: string | null
          cookie_banner_text: string | null
          cookie_expiry_days: number | null
          cookie_functional_enabled: boolean | null
          cookie_marketing_enabled: boolean | null
          cookie_privacy_url: string | null
          coupon_auto_apply_enabled: boolean | null
          coupon_first_order_discount: boolean | null
          coupon_first_order_value: number | null
          coupon_max_per_user: number | null
          coupon_stackable: boolean | null
          currency: string
          custom_order_statuses: Json | null
          discount_auto_enabled: boolean | null
          discount_auto_min_amount: number | null
          discount_auto_type: string | null
          discount_auto_value: number | null
          discount_quantity_enabled: boolean | null
          discount_quantity_rules: Json | null
          discount_vip_enabled: boolean | null
          discount_vip_tiers: Json | null
          email_abandoned_cart_delay_hours: number | null
          email_abandoned_cart_enabled: boolean | null
          email_coupon_notification: boolean | null
          email_order_confirmation: boolean | null
          email_review_request_delay_days: number | null
          email_review_request_enabled: boolean | null
          email_shipping_notification: boolean | null
          email_welcome_body: string | null
          email_welcome_enabled: boolean | null
          email_welcome_subject: string | null
          fraud_auto_block_threshold: number | null
          fraud_detection_enabled: boolean | null
          free_shipping_above: number | null
          giftcard_custom_design: boolean | null
          giftcard_enabled: boolean | null
          giftcard_expiry_months: number | null
          giftcard_max_amount: number | null
          giftcard_min_amount: number | null
          i18n_auto_translate: boolean | null
          i18n_default_language: string | null
          i18n_show_switcher: boolean | null
          i18n_supported_languages: string[] | null
          id: string
          invoice_address: string | null
          invoice_auto_generate: boolean | null
          invoice_bank_account: string | null
          invoice_company_name: string | null
          invoice_default_tax_rate: number | null
          invoice_footer_text: string | null
          invoice_header_text: string | null
          invoice_number_counter: number | null
          invoice_number_prefix: string | null
          invoice_number_year: number | null
          invoice_tax_number: string | null
          lang_auto_detect: boolean | null
          lang_available: string[] | null
          lang_default: string | null
          logo_url: string | null
          low_stock_threshold: number | null
          loyalty_discount_per_points: number | null
          loyalty_enabled: boolean | null
          loyalty_expiry_months: number | null
          loyalty_levels: string[] | null
          loyalty_min_redeem: number | null
          loyalty_points_per_currency: number | null
          loyalty_redemption_rate: number | null
          maintenance_banner_text: string | null
          maintenance_enabled: boolean | null
          maintenance_ip_whitelist: string | null
          maintenance_message: string | null
          maintenance_password: string | null
          maintenance_return_date: string | null
          notif_order_status_sms: boolean | null
          notif_promo_push: boolean | null
          notif_push_enabled: boolean | null
          notif_sms_enabled: boolean | null
          notif_sms_provider: string | null
          notification_cancelled_order: boolean | null
          notification_daily_summary: boolean | null
          notification_email: string | null
          notification_low_stock: boolean | null
          notification_new_order: boolean | null
          notification_new_review: boolean | null
          notification_new_user: boolean | null
          notification_slack_webhook: string | null
          order_auto_cancel_hours: number | null
          order_auto_confirm: boolean | null
          order_payment_retry_enabled: boolean | null
          order_payment_retry_hours: number | null
          order_reminder_after_hours: number | null
          order_reminder_enabled: boolean | null
          order_require_payment_proof: boolean | null
          order_workflow_steps: Json | null
          payment_card_enabled: boolean | null
          payment_cash_enabled: boolean | null
          payment_cod_enabled: boolean | null
          payment_installment_enabled: boolean | null
          payment_installment_months: number | null
          payment_min_order_amount: number | null
          payment_transfer_bank_name: string | null
          payment_transfer_enabled: boolean | null
          payment_transfer_iban: string | null
          popup_exit_enabled: boolean | null
          popup_exit_text: string | null
          popup_exit_title: string | null
          popup_newsletter_delay_seconds: number | null
          popup_newsletter_enabled: boolean | null
          popup_newsletter_text: string | null
          popup_newsletter_title: string | null
          popup_promo_enabled: boolean | null
          popup_promo_image_url: string | null
          popup_promo_text: string | null
          popup_promo_title: string | null
          privacy_policy: string | null
          procurement_address_city: string | null
          procurement_address_country: string | null
          procurement_address_name: string | null
          procurement_address_phone: string | null
          procurement_address_street: string | null
          procurement_address_zip: string | null
          product_default_sort: string | null
          product_default_view: string | null
          product_filter_by_color: boolean | null
          product_filter_by_material: boolean | null
          product_filter_by_price: boolean | null
          product_filter_by_size: boolean | null
          product_grid_columns: number | null
          product_items_per_page: number | null
          product_quick_view_enabled: boolean | null
          product_show_discount_badge: boolean | null
          product_show_stock_badge: boolean | null
          product_tags: Json | null
          reg_require_address: boolean | null
          reg_require_name: boolean | null
          reg_require_phone: boolean | null
          reg_social_login_enabled: boolean | null
          reg_terms_required: boolean | null
          reg_welcome_message: string | null
          reply_to_email: string | null
          return_auto_approve: boolean | null
          return_deadline_days: number | null
          return_policy: string | null
          return_reasons: string[] | null
          return_refund_method: string | null
          reviews_enabled: boolean | null
          reviews_require_approval: boolean | null
          sender_name: string | null
          seo_canonical_url: string | null
          seo_description: string | null
          seo_google_analytics_id: string | null
          seo_keywords: string | null
          seo_meta_description: string | null
          seo_meta_title: string | null
          seo_og_image: string | null
          seo_og_image_url: string | null
          seo_robots: string | null
          seo_search_console_code: string | null
          seo_sitemap_enabled: boolean | null
          seo_structured_data_enabled: boolean | null
          seo_title: string | null
          shipping_default_cost: number | null
          shipping_fee: number
          shipping_free_limit: number | null
          shipping_methods: Json | null
          shipping_zones: Json | null
          size_chart_template: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_pinterest: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_youtube: string | null
          stock_alert_email: string | null
          stock_alert_enabled: boolean | null
          stock_alert_threshold: number | null
          stock_auto_hide: boolean | null
          stock_auto_reorder_enabled: boolean | null
          stock_auto_reorder_threshold: number | null
          stock_show_availability_text: boolean | null
          stock_show_remaining_count: boolean | null
          store_name: string
          terms_and_conditions: string | null
          theme_accent_color: string | null
          theme_bg_color: string | null
          theme_button_radius: string | null
          theme_custom_css: string | null
          theme_favicon_url: string | null
          theme_font_body: string | null
          theme_font_heading: string | null
          theme_footer_text: string | null
          theme_header_height: string | null
          theme_logo_position: string | null
          theme_primary_color: string | null
          warranty_info: string | null
        }
        Insert: {
          analytics_custom_body_code?: string | null
          analytics_custom_head_code?: string | null
          analytics_enabled?: boolean | null
          analytics_fb_conversions_token?: string | null
          analytics_gtm_id?: string | null
          analytics_meta_pixel_id?: string | null
          analytics_tiktok_pixel_id?: string | null
          appearance_announcement_bar_bg_color?: string | null
          appearance_announcement_bar_enabled?: boolean | null
          appearance_announcement_bar_text?: string | null
          appearance_footer_style?: string | null
          appearance_header_style?: string | null
          appearance_product_card_style?: string | null
          auto_hide_out_of_stock?: boolean | null
          auto_procurement_default_supplier?: string | null
          auto_procurement_default_supplier_url?: string | null
          auto_procurement_enabled?: boolean | null
          auto_procurement_max_qty?: number | null
          auto_procurement_min_qty?: number | null
          auto_procurement_notify_email?: string | null
          auto_procurement_notify_enabled?: boolean | null
          auto_procurement_threshold?: number | null
          auto_procurement_use_velocity?: boolean | null
          auto_procurement_velocity_days?: number | null
          auto_reply_message?: string | null
          business_hours?: Json | null
          checkout_enable_gift_wrap?: boolean | null
          checkout_enable_notes?: boolean | null
          checkout_gift_wrap_price?: number | null
          checkout_min_order_amount?: number | null
          checkout_require_city?: boolean | null
          checkout_require_phone?: boolean | null
          checkout_require_zip?: boolean | null
          checkout_success_message?: string | null
          compare_enabled?: boolean | null
          compare_max_products?: number | null
          compare_show_differences_only?: boolean | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cookie_analytics_enabled?: boolean | null
          cookie_banner_button_text?: string | null
          cookie_banner_enabled?: boolean | null
          cookie_banner_position?: string | null
          cookie_banner_text?: string | null
          cookie_expiry_days?: number | null
          cookie_functional_enabled?: boolean | null
          cookie_marketing_enabled?: boolean | null
          cookie_privacy_url?: string | null
          coupon_auto_apply_enabled?: boolean | null
          coupon_first_order_discount?: boolean | null
          coupon_first_order_value?: number | null
          coupon_max_per_user?: number | null
          coupon_stackable?: boolean | null
          currency?: string
          custom_order_statuses?: Json | null
          discount_auto_enabled?: boolean | null
          discount_auto_min_amount?: number | null
          discount_auto_type?: string | null
          discount_auto_value?: number | null
          discount_quantity_enabled?: boolean | null
          discount_quantity_rules?: Json | null
          discount_vip_enabled?: boolean | null
          discount_vip_tiers?: Json | null
          email_abandoned_cart_delay_hours?: number | null
          email_abandoned_cart_enabled?: boolean | null
          email_coupon_notification?: boolean | null
          email_order_confirmation?: boolean | null
          email_review_request_delay_days?: number | null
          email_review_request_enabled?: boolean | null
          email_shipping_notification?: boolean | null
          email_welcome_body?: string | null
          email_welcome_enabled?: boolean | null
          email_welcome_subject?: string | null
          fraud_auto_block_threshold?: number | null
          fraud_detection_enabled?: boolean | null
          free_shipping_above?: number | null
          giftcard_custom_design?: boolean | null
          giftcard_enabled?: boolean | null
          giftcard_expiry_months?: number | null
          giftcard_max_amount?: number | null
          giftcard_min_amount?: number | null
          i18n_auto_translate?: boolean | null
          i18n_default_language?: string | null
          i18n_show_switcher?: boolean | null
          i18n_supported_languages?: string[] | null
          id?: string
          invoice_address?: string | null
          invoice_auto_generate?: boolean | null
          invoice_bank_account?: string | null
          invoice_company_name?: string | null
          invoice_default_tax_rate?: number | null
          invoice_footer_text?: string | null
          invoice_header_text?: string | null
          invoice_number_counter?: number | null
          invoice_number_prefix?: string | null
          invoice_number_year?: number | null
          invoice_tax_number?: string | null
          lang_auto_detect?: boolean | null
          lang_available?: string[] | null
          lang_default?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          loyalty_discount_per_points?: number | null
          loyalty_enabled?: boolean | null
          loyalty_expiry_months?: number | null
          loyalty_levels?: string[] | null
          loyalty_min_redeem?: number | null
          loyalty_points_per_currency?: number | null
          loyalty_redemption_rate?: number | null
          maintenance_banner_text?: string | null
          maintenance_enabled?: boolean | null
          maintenance_ip_whitelist?: string | null
          maintenance_message?: string | null
          maintenance_password?: string | null
          maintenance_return_date?: string | null
          notif_order_status_sms?: boolean | null
          notif_promo_push?: boolean | null
          notif_push_enabled?: boolean | null
          notif_sms_enabled?: boolean | null
          notif_sms_provider?: string | null
          notification_cancelled_order?: boolean | null
          notification_daily_summary?: boolean | null
          notification_email?: string | null
          notification_low_stock?: boolean | null
          notification_new_order?: boolean | null
          notification_new_review?: boolean | null
          notification_new_user?: boolean | null
          notification_slack_webhook?: string | null
          order_auto_cancel_hours?: number | null
          order_auto_confirm?: boolean | null
          order_payment_retry_enabled?: boolean | null
          order_payment_retry_hours?: number | null
          order_reminder_after_hours?: number | null
          order_reminder_enabled?: boolean | null
          order_require_payment_proof?: boolean | null
          order_workflow_steps?: Json | null
          payment_card_enabled?: boolean | null
          payment_cash_enabled?: boolean | null
          payment_cod_enabled?: boolean | null
          payment_installment_enabled?: boolean | null
          payment_installment_months?: number | null
          payment_min_order_amount?: number | null
          payment_transfer_bank_name?: string | null
          payment_transfer_enabled?: boolean | null
          payment_transfer_iban?: string | null
          popup_exit_enabled?: boolean | null
          popup_exit_text?: string | null
          popup_exit_title?: string | null
          popup_newsletter_delay_seconds?: number | null
          popup_newsletter_enabled?: boolean | null
          popup_newsletter_text?: string | null
          popup_newsletter_title?: string | null
          popup_promo_enabled?: boolean | null
          popup_promo_image_url?: string | null
          popup_promo_text?: string | null
          popup_promo_title?: string | null
          privacy_policy?: string | null
          procurement_address_city?: string | null
          procurement_address_country?: string | null
          procurement_address_name?: string | null
          procurement_address_phone?: string | null
          procurement_address_street?: string | null
          procurement_address_zip?: string | null
          product_default_sort?: string | null
          product_default_view?: string | null
          product_filter_by_color?: boolean | null
          product_filter_by_material?: boolean | null
          product_filter_by_price?: boolean | null
          product_filter_by_size?: boolean | null
          product_grid_columns?: number | null
          product_items_per_page?: number | null
          product_quick_view_enabled?: boolean | null
          product_show_discount_badge?: boolean | null
          product_show_stock_badge?: boolean | null
          product_tags?: Json | null
          reg_require_address?: boolean | null
          reg_require_name?: boolean | null
          reg_require_phone?: boolean | null
          reg_social_login_enabled?: boolean | null
          reg_terms_required?: boolean | null
          reg_welcome_message?: string | null
          reply_to_email?: string | null
          return_auto_approve?: boolean | null
          return_deadline_days?: number | null
          return_policy?: string | null
          return_reasons?: string[] | null
          return_refund_method?: string | null
          reviews_enabled?: boolean | null
          reviews_require_approval?: boolean | null
          sender_name?: string | null
          seo_canonical_url?: string | null
          seo_description?: string | null
          seo_google_analytics_id?: string | null
          seo_keywords?: string | null
          seo_meta_description?: string | null
          seo_meta_title?: string | null
          seo_og_image?: string | null
          seo_og_image_url?: string | null
          seo_robots?: string | null
          seo_search_console_code?: string | null
          seo_sitemap_enabled?: boolean | null
          seo_structured_data_enabled?: boolean | null
          seo_title?: string | null
          shipping_default_cost?: number | null
          shipping_fee?: number
          shipping_free_limit?: number | null
          shipping_methods?: Json | null
          shipping_zones?: Json | null
          size_chart_template?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_pinterest?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          stock_alert_email?: string | null
          stock_alert_enabled?: boolean | null
          stock_alert_threshold?: number | null
          stock_auto_hide?: boolean | null
          stock_auto_reorder_enabled?: boolean | null
          stock_auto_reorder_threshold?: number | null
          stock_show_availability_text?: boolean | null
          stock_show_remaining_count?: boolean | null
          store_name?: string
          terms_and_conditions?: string | null
          theme_accent_color?: string | null
          theme_bg_color?: string | null
          theme_button_radius?: string | null
          theme_custom_css?: string | null
          theme_favicon_url?: string | null
          theme_font_body?: string | null
          theme_font_heading?: string | null
          theme_footer_text?: string | null
          theme_header_height?: string | null
          theme_logo_position?: string | null
          theme_primary_color?: string | null
          warranty_info?: string | null
        }
        Update: {
          analytics_custom_body_code?: string | null
          analytics_custom_head_code?: string | null
          analytics_enabled?: boolean | null
          analytics_fb_conversions_token?: string | null
          analytics_gtm_id?: string | null
          analytics_meta_pixel_id?: string | null
          analytics_tiktok_pixel_id?: string | null
          appearance_announcement_bar_bg_color?: string | null
          appearance_announcement_bar_enabled?: boolean | null
          appearance_announcement_bar_text?: string | null
          appearance_footer_style?: string | null
          appearance_header_style?: string | null
          appearance_product_card_style?: string | null
          auto_hide_out_of_stock?: boolean | null
          auto_procurement_default_supplier?: string | null
          auto_procurement_default_supplier_url?: string | null
          auto_procurement_enabled?: boolean | null
          auto_procurement_max_qty?: number | null
          auto_procurement_min_qty?: number | null
          auto_procurement_notify_email?: string | null
          auto_procurement_notify_enabled?: boolean | null
          auto_procurement_threshold?: number | null
          auto_procurement_use_velocity?: boolean | null
          auto_procurement_velocity_days?: number | null
          auto_reply_message?: string | null
          business_hours?: Json | null
          checkout_enable_gift_wrap?: boolean | null
          checkout_enable_notes?: boolean | null
          checkout_gift_wrap_price?: number | null
          checkout_min_order_amount?: number | null
          checkout_require_city?: boolean | null
          checkout_require_phone?: boolean | null
          checkout_require_zip?: boolean | null
          checkout_success_message?: string | null
          compare_enabled?: boolean | null
          compare_max_products?: number | null
          compare_show_differences_only?: boolean | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cookie_analytics_enabled?: boolean | null
          cookie_banner_button_text?: string | null
          cookie_banner_enabled?: boolean | null
          cookie_banner_position?: string | null
          cookie_banner_text?: string | null
          cookie_expiry_days?: number | null
          cookie_functional_enabled?: boolean | null
          cookie_marketing_enabled?: boolean | null
          cookie_privacy_url?: string | null
          coupon_auto_apply_enabled?: boolean | null
          coupon_first_order_discount?: boolean | null
          coupon_first_order_value?: number | null
          coupon_max_per_user?: number | null
          coupon_stackable?: boolean | null
          currency?: string
          custom_order_statuses?: Json | null
          discount_auto_enabled?: boolean | null
          discount_auto_min_amount?: number | null
          discount_auto_type?: string | null
          discount_auto_value?: number | null
          discount_quantity_enabled?: boolean | null
          discount_quantity_rules?: Json | null
          discount_vip_enabled?: boolean | null
          discount_vip_tiers?: Json | null
          email_abandoned_cart_delay_hours?: number | null
          email_abandoned_cart_enabled?: boolean | null
          email_coupon_notification?: boolean | null
          email_order_confirmation?: boolean | null
          email_review_request_delay_days?: number | null
          email_review_request_enabled?: boolean | null
          email_shipping_notification?: boolean | null
          email_welcome_body?: string | null
          email_welcome_enabled?: boolean | null
          email_welcome_subject?: string | null
          fraud_auto_block_threshold?: number | null
          fraud_detection_enabled?: boolean | null
          free_shipping_above?: number | null
          giftcard_custom_design?: boolean | null
          giftcard_enabled?: boolean | null
          giftcard_expiry_months?: number | null
          giftcard_max_amount?: number | null
          giftcard_min_amount?: number | null
          i18n_auto_translate?: boolean | null
          i18n_default_language?: string | null
          i18n_show_switcher?: boolean | null
          i18n_supported_languages?: string[] | null
          id?: string
          invoice_address?: string | null
          invoice_auto_generate?: boolean | null
          invoice_bank_account?: string | null
          invoice_company_name?: string | null
          invoice_default_tax_rate?: number | null
          invoice_footer_text?: string | null
          invoice_header_text?: string | null
          invoice_number_counter?: number | null
          invoice_number_prefix?: string | null
          invoice_number_year?: number | null
          invoice_tax_number?: string | null
          lang_auto_detect?: boolean | null
          lang_available?: string[] | null
          lang_default?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          loyalty_discount_per_points?: number | null
          loyalty_enabled?: boolean | null
          loyalty_expiry_months?: number | null
          loyalty_levels?: string[] | null
          loyalty_min_redeem?: number | null
          loyalty_points_per_currency?: number | null
          loyalty_redemption_rate?: number | null
          maintenance_banner_text?: string | null
          maintenance_enabled?: boolean | null
          maintenance_ip_whitelist?: string | null
          maintenance_message?: string | null
          maintenance_password?: string | null
          maintenance_return_date?: string | null
          notif_order_status_sms?: boolean | null
          notif_promo_push?: boolean | null
          notif_push_enabled?: boolean | null
          notif_sms_enabled?: boolean | null
          notif_sms_provider?: string | null
          notification_cancelled_order?: boolean | null
          notification_daily_summary?: boolean | null
          notification_email?: string | null
          notification_low_stock?: boolean | null
          notification_new_order?: boolean | null
          notification_new_review?: boolean | null
          notification_new_user?: boolean | null
          notification_slack_webhook?: string | null
          order_auto_cancel_hours?: number | null
          order_auto_confirm?: boolean | null
          order_payment_retry_enabled?: boolean | null
          order_payment_retry_hours?: number | null
          order_reminder_after_hours?: number | null
          order_reminder_enabled?: boolean | null
          order_require_payment_proof?: boolean | null
          order_workflow_steps?: Json | null
          payment_card_enabled?: boolean | null
          payment_cash_enabled?: boolean | null
          payment_cod_enabled?: boolean | null
          payment_installment_enabled?: boolean | null
          payment_installment_months?: number | null
          payment_min_order_amount?: number | null
          payment_transfer_bank_name?: string | null
          payment_transfer_enabled?: boolean | null
          payment_transfer_iban?: string | null
          popup_exit_enabled?: boolean | null
          popup_exit_text?: string | null
          popup_exit_title?: string | null
          popup_newsletter_delay_seconds?: number | null
          popup_newsletter_enabled?: boolean | null
          popup_newsletter_text?: string | null
          popup_newsletter_title?: string | null
          popup_promo_enabled?: boolean | null
          popup_promo_image_url?: string | null
          popup_promo_text?: string | null
          popup_promo_title?: string | null
          privacy_policy?: string | null
          procurement_address_city?: string | null
          procurement_address_country?: string | null
          procurement_address_name?: string | null
          procurement_address_phone?: string | null
          procurement_address_street?: string | null
          procurement_address_zip?: string | null
          product_default_sort?: string | null
          product_default_view?: string | null
          product_filter_by_color?: boolean | null
          product_filter_by_material?: boolean | null
          product_filter_by_price?: boolean | null
          product_filter_by_size?: boolean | null
          product_grid_columns?: number | null
          product_items_per_page?: number | null
          product_quick_view_enabled?: boolean | null
          product_show_discount_badge?: boolean | null
          product_show_stock_badge?: boolean | null
          product_tags?: Json | null
          reg_require_address?: boolean | null
          reg_require_name?: boolean | null
          reg_require_phone?: boolean | null
          reg_social_login_enabled?: boolean | null
          reg_terms_required?: boolean | null
          reg_welcome_message?: string | null
          reply_to_email?: string | null
          return_auto_approve?: boolean | null
          return_deadline_days?: number | null
          return_policy?: string | null
          return_reasons?: string[] | null
          return_refund_method?: string | null
          reviews_enabled?: boolean | null
          reviews_require_approval?: boolean | null
          sender_name?: string | null
          seo_canonical_url?: string | null
          seo_description?: string | null
          seo_google_analytics_id?: string | null
          seo_keywords?: string | null
          seo_meta_description?: string | null
          seo_meta_title?: string | null
          seo_og_image?: string | null
          seo_og_image_url?: string | null
          seo_robots?: string | null
          seo_search_console_code?: string | null
          seo_sitemap_enabled?: boolean | null
          seo_structured_data_enabled?: boolean | null
          seo_title?: string | null
          shipping_default_cost?: number | null
          shipping_fee?: number
          shipping_free_limit?: number | null
          shipping_methods?: Json | null
          shipping_zones?: Json | null
          size_chart_template?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_pinterest?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          stock_alert_email?: string | null
          stock_alert_enabled?: boolean | null
          stock_alert_threshold?: number | null
          stock_auto_hide?: boolean | null
          stock_auto_reorder_enabled?: boolean | null
          stock_auto_reorder_threshold?: number | null
          stock_show_availability_text?: boolean | null
          stock_show_remaining_count?: boolean | null
          store_name?: string
          terms_and_conditions?: string | null
          theme_accent_color?: string | null
          theme_bg_color?: string | null
          theme_button_radius?: string | null
          theme_custom_css?: string | null
          theme_favicon_url?: string | null
          theme_font_body?: string | null
          theme_font_heading?: string | null
          theme_footer_text?: string | null
          theme_header_height?: string | null
          theme_logo_position?: string | null
          theme_primary_color?: string | null
          warranty_info?: string | null
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          bank_details: Json | null
          created_at: string | null
          currency: string | null
          id: string
          invoice_ref: string | null
          method: string | null
          notes: string | null
          status: string | null
          supplier_name: string
        }
        Insert: {
          amount?: number
          bank_details?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_ref?: string | null
          method?: string | null
          notes?: string | null
          status?: string | null
          supplier_name?: string
        }
        Update: {
          amount?: number
          bank_details?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_ref?: string | null
          method?: string | null
          notes?: string | null
          status?: string | null
          supplier_name?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      store_settings_public: {
        Row: {
          appearance_announcement_bar_bg_color: string | null
          appearance_announcement_bar_enabled: boolean | null
          appearance_announcement_bar_text: string | null
          appearance_footer_style: string | null
          appearance_header_style: string | null
          appearance_product_card_style: string | null
          auto_hide_out_of_stock: boolean | null
          checkout_enable_gift_wrap: boolean | null
          checkout_enable_notes: boolean | null
          checkout_gift_wrap_price: number | null
          checkout_min_order_amount: number | null
          checkout_require_city: boolean | null
          checkout_require_phone: boolean | null
          checkout_require_zip: boolean | null
          checkout_success_message: string | null
          compare_enabled: boolean | null
          compare_max_products: number | null
          compare_show_differences_only: boolean | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          cookie_banner_button_text: string | null
          cookie_banner_enabled: boolean | null
          cookie_banner_position: string | null
          cookie_banner_text: string | null
          coupon_auto_apply_enabled: boolean | null
          coupon_first_order_discount: boolean | null
          coupon_first_order_value: number | null
          coupon_stackable: boolean | null
          currency: string | null
          discount_auto_enabled: boolean | null
          discount_auto_min_amount: number | null
          discount_auto_type: string | null
          discount_auto_value: number | null
          discount_quantity_enabled: boolean | null
          discount_quantity_rules: Json | null
          email_order_confirmation: boolean | null
          email_shipping_notification: boolean | null
          free_shipping_above: number | null
          giftcard_custom_design: boolean | null
          giftcard_enabled: boolean | null
          giftcard_expiry_months: number | null
          giftcard_max_amount: number | null
          giftcard_min_amount: number | null
          i18n_default_language: string | null
          i18n_show_switcher: boolean | null
          i18n_supported_languages: string[] | null
          id: string | null
          lang_auto_detect: boolean | null
          lang_available: string[] | null
          lang_default: string | null
          logo_url: string | null
          low_stock_threshold: number | null
          loyalty_discount_per_points: number | null
          loyalty_enabled: boolean | null
          loyalty_expiry_months: number | null
          loyalty_levels: string[] | null
          loyalty_min_redeem: number | null
          loyalty_points_per_currency: number | null
          loyalty_redemption_rate: number | null
          maintenance_enabled: boolean | null
          maintenance_message: string | null
          payment_card_enabled: boolean | null
          payment_cash_enabled: boolean | null
          payment_cod_enabled: boolean | null
          popup_exit_enabled: boolean | null
          popup_exit_text: string | null
          popup_exit_title: string | null
          popup_newsletter_delay_seconds: number | null
          popup_newsletter_enabled: boolean | null
          popup_newsletter_text: string | null
          popup_newsletter_title: string | null
          popup_promo_enabled: boolean | null
          popup_promo_image_url: string | null
          popup_promo_text: string | null
          popup_promo_title: string | null
          privacy_policy: string | null
          product_default_sort: string | null
          product_default_view: string | null
          product_filter_by_color: boolean | null
          product_filter_by_material: boolean | null
          product_filter_by_price: boolean | null
          product_filter_by_size: boolean | null
          product_grid_columns: number | null
          product_items_per_page: number | null
          product_quick_view_enabled: boolean | null
          product_show_discount_badge: boolean | null
          product_show_stock_badge: boolean | null
          product_tags: Json | null
          reply_to_email: string | null
          return_deadline_days: number | null
          return_policy: string | null
          return_reasons: string[] | null
          return_refund_method: string | null
          reviews_enabled: boolean | null
          reviews_require_approval: boolean | null
          sender_name: string | null
          seo_canonical_url: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_meta_description: string | null
          seo_meta_title: string | null
          seo_og_image: string | null
          seo_og_image_url: string | null
          seo_robots: string | null
          seo_sitemap_enabled: boolean | null
          seo_structured_data_enabled: boolean | null
          seo_title: string | null
          shipping_default_cost: number | null
          shipping_fee: number | null
          shipping_free_limit: number | null
          shipping_methods: Json | null
          shipping_zones: Json | null
          size_chart_template: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_pinterest: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_youtube: string | null
          store_name: string | null
          terms_and_conditions: string | null
          theme_accent_color: string | null
          theme_bg_color: string | null
          theme_button_radius: string | null
          theme_custom_css: string | null
          theme_favicon_url: string | null
          theme_font_body: string | null
          theme_font_heading: string | null
          theme_footer_text: string | null
          theme_header_height: string | null
          theme_logo_position: string | null
          theme_primary_color: string | null
          warranty_info: string | null
        }
        Insert: {
          appearance_announcement_bar_bg_color?: string | null
          appearance_announcement_bar_enabled?: boolean | null
          appearance_announcement_bar_text?: string | null
          appearance_footer_style?: string | null
          appearance_header_style?: string | null
          appearance_product_card_style?: string | null
          auto_hide_out_of_stock?: boolean | null
          checkout_enable_gift_wrap?: boolean | null
          checkout_enable_notes?: boolean | null
          checkout_gift_wrap_price?: number | null
          checkout_min_order_amount?: number | null
          checkout_require_city?: boolean | null
          checkout_require_phone?: boolean | null
          checkout_require_zip?: boolean | null
          checkout_success_message?: string | null
          compare_enabled?: boolean | null
          compare_max_products?: number | null
          compare_show_differences_only?: boolean | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cookie_banner_button_text?: string | null
          cookie_banner_enabled?: boolean | null
          cookie_banner_position?: string | null
          cookie_banner_text?: string | null
          coupon_auto_apply_enabled?: boolean | null
          coupon_first_order_discount?: boolean | null
          coupon_first_order_value?: number | null
          coupon_stackable?: boolean | null
          currency?: string | null
          discount_auto_enabled?: boolean | null
          discount_auto_min_amount?: number | null
          discount_auto_type?: string | null
          discount_auto_value?: number | null
          discount_quantity_enabled?: boolean | null
          discount_quantity_rules?: Json | null
          email_order_confirmation?: boolean | null
          email_shipping_notification?: boolean | null
          free_shipping_above?: number | null
          giftcard_custom_design?: boolean | null
          giftcard_enabled?: boolean | null
          giftcard_expiry_months?: number | null
          giftcard_max_amount?: number | null
          giftcard_min_amount?: number | null
          i18n_default_language?: string | null
          i18n_show_switcher?: boolean | null
          i18n_supported_languages?: string[] | null
          id?: string | null
          lang_auto_detect?: boolean | null
          lang_available?: string[] | null
          lang_default?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          loyalty_discount_per_points?: number | null
          loyalty_enabled?: boolean | null
          loyalty_expiry_months?: number | null
          loyalty_levels?: string[] | null
          loyalty_min_redeem?: number | null
          loyalty_points_per_currency?: number | null
          loyalty_redemption_rate?: number | null
          maintenance_enabled?: boolean | null
          maintenance_message?: string | null
          payment_card_enabled?: boolean | null
          payment_cash_enabled?: boolean | null
          payment_cod_enabled?: boolean | null
          popup_exit_enabled?: boolean | null
          popup_exit_text?: string | null
          popup_exit_title?: string | null
          popup_newsletter_delay_seconds?: number | null
          popup_newsletter_enabled?: boolean | null
          popup_newsletter_text?: string | null
          popup_newsletter_title?: string | null
          popup_promo_enabled?: boolean | null
          popup_promo_image_url?: string | null
          popup_promo_text?: string | null
          popup_promo_title?: string | null
          privacy_policy?: string | null
          product_default_sort?: string | null
          product_default_view?: string | null
          product_filter_by_color?: boolean | null
          product_filter_by_material?: boolean | null
          product_filter_by_price?: boolean | null
          product_filter_by_size?: boolean | null
          product_grid_columns?: number | null
          product_items_per_page?: number | null
          product_quick_view_enabled?: boolean | null
          product_show_discount_badge?: boolean | null
          product_show_stock_badge?: boolean | null
          product_tags?: Json | null
          reply_to_email?: string | null
          return_deadline_days?: number | null
          return_policy?: string | null
          return_reasons?: string[] | null
          return_refund_method?: string | null
          reviews_enabled?: boolean | null
          reviews_require_approval?: boolean | null
          sender_name?: string | null
          seo_canonical_url?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_meta_description?: string | null
          seo_meta_title?: string | null
          seo_og_image?: string | null
          seo_og_image_url?: string | null
          seo_robots?: string | null
          seo_sitemap_enabled?: boolean | null
          seo_structured_data_enabled?: boolean | null
          seo_title?: string | null
          shipping_default_cost?: number | null
          shipping_fee?: number | null
          shipping_free_limit?: number | null
          shipping_methods?: Json | null
          shipping_zones?: Json | null
          size_chart_template?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_pinterest?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          store_name?: string | null
          terms_and_conditions?: string | null
          theme_accent_color?: string | null
          theme_bg_color?: string | null
          theme_button_radius?: string | null
          theme_custom_css?: string | null
          theme_favicon_url?: string | null
          theme_font_body?: string | null
          theme_font_heading?: string | null
          theme_footer_text?: string | null
          theme_header_height?: string | null
          theme_logo_position?: string | null
          theme_primary_color?: string | null
          warranty_info?: string | null
        }
        Update: {
          appearance_announcement_bar_bg_color?: string | null
          appearance_announcement_bar_enabled?: boolean | null
          appearance_announcement_bar_text?: string | null
          appearance_footer_style?: string | null
          appearance_header_style?: string | null
          appearance_product_card_style?: string | null
          auto_hide_out_of_stock?: boolean | null
          checkout_enable_gift_wrap?: boolean | null
          checkout_enable_notes?: boolean | null
          checkout_gift_wrap_price?: number | null
          checkout_min_order_amount?: number | null
          checkout_require_city?: boolean | null
          checkout_require_phone?: boolean | null
          checkout_require_zip?: boolean | null
          checkout_success_message?: string | null
          compare_enabled?: boolean | null
          compare_max_products?: number | null
          compare_show_differences_only?: boolean | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cookie_banner_button_text?: string | null
          cookie_banner_enabled?: boolean | null
          cookie_banner_position?: string | null
          cookie_banner_text?: string | null
          coupon_auto_apply_enabled?: boolean | null
          coupon_first_order_discount?: boolean | null
          coupon_first_order_value?: number | null
          coupon_stackable?: boolean | null
          currency?: string | null
          discount_auto_enabled?: boolean | null
          discount_auto_min_amount?: number | null
          discount_auto_type?: string | null
          discount_auto_value?: number | null
          discount_quantity_enabled?: boolean | null
          discount_quantity_rules?: Json | null
          email_order_confirmation?: boolean | null
          email_shipping_notification?: boolean | null
          free_shipping_above?: number | null
          giftcard_custom_design?: boolean | null
          giftcard_enabled?: boolean | null
          giftcard_expiry_months?: number | null
          giftcard_max_amount?: number | null
          giftcard_min_amount?: number | null
          i18n_default_language?: string | null
          i18n_show_switcher?: boolean | null
          i18n_supported_languages?: string[] | null
          id?: string | null
          lang_auto_detect?: boolean | null
          lang_available?: string[] | null
          lang_default?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          loyalty_discount_per_points?: number | null
          loyalty_enabled?: boolean | null
          loyalty_expiry_months?: number | null
          loyalty_levels?: string[] | null
          loyalty_min_redeem?: number | null
          loyalty_points_per_currency?: number | null
          loyalty_redemption_rate?: number | null
          maintenance_enabled?: boolean | null
          maintenance_message?: string | null
          payment_card_enabled?: boolean | null
          payment_cash_enabled?: boolean | null
          payment_cod_enabled?: boolean | null
          popup_exit_enabled?: boolean | null
          popup_exit_text?: string | null
          popup_exit_title?: string | null
          popup_newsletter_delay_seconds?: number | null
          popup_newsletter_enabled?: boolean | null
          popup_newsletter_text?: string | null
          popup_newsletter_title?: string | null
          popup_promo_enabled?: boolean | null
          popup_promo_image_url?: string | null
          popup_promo_text?: string | null
          popup_promo_title?: string | null
          privacy_policy?: string | null
          product_default_sort?: string | null
          product_default_view?: string | null
          product_filter_by_color?: boolean | null
          product_filter_by_material?: boolean | null
          product_filter_by_price?: boolean | null
          product_filter_by_size?: boolean | null
          product_grid_columns?: number | null
          product_items_per_page?: number | null
          product_quick_view_enabled?: boolean | null
          product_show_discount_badge?: boolean | null
          product_show_stock_badge?: boolean | null
          product_tags?: Json | null
          reply_to_email?: string | null
          return_deadline_days?: number | null
          return_policy?: string | null
          return_reasons?: string[] | null
          return_refund_method?: string | null
          reviews_enabled?: boolean | null
          reviews_require_approval?: boolean | null
          sender_name?: string | null
          seo_canonical_url?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_meta_description?: string | null
          seo_meta_title?: string | null
          seo_og_image?: string | null
          seo_og_image_url?: string | null
          seo_robots?: string | null
          seo_sitemap_enabled?: boolean | null
          seo_structured_data_enabled?: boolean | null
          seo_title?: string | null
          shipping_default_cost?: number | null
          shipping_fee?: number | null
          shipping_free_limit?: number | null
          shipping_methods?: Json | null
          shipping_zones?: Json | null
          size_chart_template?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_pinterest?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          store_name?: string | null
          terms_and_conditions?: string | null
          theme_accent_color?: string | null
          theme_bg_color?: string | null
          theme_button_radius?: string | null
          theme_custom_css?: string | null
          theme_favicon_url?: string | null
          theme_font_body?: string | null
          theme_font_heading?: string | null
          theme_footer_text?: string | null
          theme_header_height?: string | null
          theme_logo_position?: string | null
          theme_primary_color?: string | null
          warranty_info?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      authenticated_email: { Args: never; Returns: string }
      calc_reorder_quantity: {
        Args: { _product_id: string; _product_name: string }
        Returns: {
          qty: number
          velocity: number
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_public_store_settings: {
        Args: never
        Returns: {
          appearance_announcement_bar_bg_color: string | null
          appearance_announcement_bar_enabled: boolean | null
          appearance_announcement_bar_text: string | null
          appearance_footer_style: string | null
          appearance_header_style: string | null
          appearance_product_card_style: string | null
          auto_hide_out_of_stock: boolean | null
          checkout_enable_gift_wrap: boolean | null
          checkout_enable_notes: boolean | null
          checkout_gift_wrap_price: number | null
          checkout_min_order_amount: number | null
          checkout_require_city: boolean | null
          checkout_require_phone: boolean | null
          checkout_require_zip: boolean | null
          checkout_success_message: string | null
          compare_enabled: boolean | null
          compare_max_products: number | null
          compare_show_differences_only: boolean | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          cookie_banner_button_text: string | null
          cookie_banner_enabled: boolean | null
          cookie_banner_position: string | null
          cookie_banner_text: string | null
          coupon_auto_apply_enabled: boolean | null
          coupon_first_order_discount: boolean | null
          coupon_first_order_value: number | null
          coupon_stackable: boolean | null
          currency: string | null
          discount_auto_enabled: boolean | null
          discount_auto_min_amount: number | null
          discount_auto_type: string | null
          discount_auto_value: number | null
          discount_quantity_enabled: boolean | null
          discount_quantity_rules: Json | null
          email_order_confirmation: boolean | null
          email_shipping_notification: boolean | null
          free_shipping_above: number | null
          giftcard_custom_design: boolean | null
          giftcard_enabled: boolean | null
          giftcard_expiry_months: number | null
          giftcard_max_amount: number | null
          giftcard_min_amount: number | null
          i18n_default_language: string | null
          i18n_show_switcher: boolean | null
          i18n_supported_languages: string[] | null
          id: string | null
          lang_auto_detect: boolean | null
          lang_available: string[] | null
          lang_default: string | null
          logo_url: string | null
          low_stock_threshold: number | null
          loyalty_discount_per_points: number | null
          loyalty_enabled: boolean | null
          loyalty_expiry_months: number | null
          loyalty_levels: string[] | null
          loyalty_min_redeem: number | null
          loyalty_points_per_currency: number | null
          loyalty_redemption_rate: number | null
          maintenance_enabled: boolean | null
          maintenance_message: string | null
          payment_card_enabled: boolean | null
          payment_cash_enabled: boolean | null
          payment_cod_enabled: boolean | null
          popup_exit_enabled: boolean | null
          popup_exit_text: string | null
          popup_exit_title: string | null
          popup_newsletter_delay_seconds: number | null
          popup_newsletter_enabled: boolean | null
          popup_newsletter_text: string | null
          popup_newsletter_title: string | null
          popup_promo_enabled: boolean | null
          popup_promo_image_url: string | null
          popup_promo_text: string | null
          popup_promo_title: string | null
          privacy_policy: string | null
          product_default_sort: string | null
          product_default_view: string | null
          product_filter_by_color: boolean | null
          product_filter_by_material: boolean | null
          product_filter_by_price: boolean | null
          product_filter_by_size: boolean | null
          product_grid_columns: number | null
          product_items_per_page: number | null
          product_quick_view_enabled: boolean | null
          product_show_discount_badge: boolean | null
          product_show_stock_badge: boolean | null
          product_tags: Json | null
          reply_to_email: string | null
          return_deadline_days: number | null
          return_policy: string | null
          return_reasons: string[] | null
          return_refund_method: string | null
          reviews_enabled: boolean | null
          reviews_require_approval: boolean | null
          sender_name: string | null
          seo_canonical_url: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_meta_description: string | null
          seo_meta_title: string | null
          seo_og_image: string | null
          seo_og_image_url: string | null
          seo_robots: string | null
          seo_sitemap_enabled: boolean | null
          seo_structured_data_enabled: boolean | null
          seo_title: string | null
          shipping_default_cost: number | null
          shipping_fee: number | null
          shipping_free_limit: number | null
          shipping_methods: Json | null
          shipping_zones: Json | null
          size_chart_template: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_pinterest: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_youtube: string | null
          store_name: string | null
          terms_and_conditions: string | null
          theme_accent_color: string | null
          theme_bg_color: string | null
          theme_button_radius: string | null
          theme_custom_css: string | null
          theme_favicon_url: string | null
          theme_font_body: string | null
          theme_font_heading: string | null
          theme_footer_text: string | null
          theme_header_height: string | null
          theme_logo_position: string | null
          theme_primary_color: string | null
          warranty_info: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "store_settings_public"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_waitlist_share_boost: {
        Args: { _waitlist_id: string }
        Returns: undefined
      }
      register_waitlist_share: { Args: { _share_code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

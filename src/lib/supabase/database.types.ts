// Generated from the Supabase project's schema. Regenerate after changing tables.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_prices: {
        Row: {
          customer_id: string
          price: number
          stock_item_id: string
        }
        Insert: {
          customer_id: string
          price: number
          stock_item_id: string
        }
        Update: {
          customer_id?: string
          price?: number
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_prices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_prices_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          unit_price: number
        }
        Insert: {
          description?: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          abn: string
          address: string
          bank_account_name: string
          bank_account_number: string
          bank_bsb: string
          business_name: string
          email: string
          id: boolean
          next_number: number
          payable_to: string
          payment_terms_days: number
          phone: string
          updated_at: string
        }
        Insert: {
          abn?: string
          address?: string
          bank_account_name?: string
          bank_account_number?: string
          bank_bsb?: string
          business_name?: string
          email?: string
          id?: boolean
          next_number?: number
          payable_to?: string
          payment_terms_days?: number
          phone?: string
          updated_at?: string
        }
        Update: {
          abn?: string
          address?: string
          bank_account_name?: string
          bank_account_number?: string
          bank_bsb?: string
          business_name?: string
          email?: string
          id?: boolean
          next_number?: number
          payable_to?: string
          payment_terms_days?: number
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          bill_to: string
          created_at: string
          customer_id: string | null
          due_on: string
          id: string
          issued_on: string
          notes: string | null
          number: number
          order_id: string | null
          paid_on: string | null
          seller: Json
          updated_at: string
        }
        Insert: {
          bill_to?: string
          created_at?: string
          customer_id?: string | null
          due_on: string
          id?: string
          issued_on: string
          notes?: string | null
          number: number
          order_id?: string | null
          paid_on?: string | null
          seller: Json
          updated_at?: string
        }
        Update: {
          bill_to?: string
          created_at?: string
          customer_id?: string | null
          due_on?: string
          id?: string
          issued_on?: string
          notes?: string | null
          number?: number
          order_id?: string | null
          paid_on?: string | null
          seller?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          id: string
          order_id: string
          quantity: number
          stock_item_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          quantity: number
          stock_item_id: string
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          quantity?: number
          stock_item_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer: string
          customer_id: string | null
          id: string
          kind: string
          needed_by: string | null
          note: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer: string
          customer_id?: string | null
          id?: string
          kind?: string
          needed_by?: string | null
          note?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer?: string
          customer_id?: string | null
          id?: string
          kind?: string
          needed_by?: string | null
          note?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          ingredients: string | null
          label: string
          label_image: string | null
          position: number
          price: number
          product_id: string
          sold_out: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredients?: string | null
          label: string
          label_image?: string | null
          position?: number
          price: number
          product_id: string
          sold_out?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredients?: string | null
          label?: string
          label_image?: string | null
          position?: number
          price?: number
          product_id?: string
          sold_out?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: Json
          id: string
          image: string
          ingredients_note: string | null
          is_published: boolean
          label_default_flavour: string | null
          label_size: string | null
          legacy_url_id: string | null
          option_name: string
          position: number
          slug: string
          subscription_discount: number | null
          subscription_interval: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json
          id?: string
          image: string
          ingredients_note?: string | null
          is_published?: boolean
          label_default_flavour?: string | null
          label_size?: string | null
          legacy_url_id?: string | null
          option_name: string
          position?: number
          slug: string
          subscription_discount?: number | null
          subscription_interval?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json
          id?: string
          image?: string
          ingredients_note?: string | null
          is_published?: boolean
          label_default_flavour?: string | null
          label_size?: string | null
          legacy_url_id?: string | null
          option_name?: string
          position?: number
          slug?: string
          subscription_discount?: number | null
          subscription_interval?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number | null
          created_at: string
          email_id: string
          files: Json
          gst: number | null
          id: string
          note: string | null
          received_at: string
          sender: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          email_id: string
          files?: Json
          gst?: number | null
          id?: string
          note?: string | null
          received_at: string
          sender?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          email_id?: string
          files?: Json
          gst?: number | null
          id?: string
          note?: string | null
          received_at?: string
          sender?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          base_chocolate: string | null
          chocolate_grams: number | null
          created_at: string
          id: string
          is_active: boolean
          is_extra: boolean
          name: string
          position: number
          product_id: string
          quantity: number
          updated_at: string
          variant_id: string | null
          wholesale_price: number
        }
        Insert: {
          base_chocolate?: string | null
          chocolate_grams?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_extra?: boolean
          name: string
          position?: number
          product_id: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
          wholesale_price?: number
        }
        Update: {
          base_chocolate?: string | null
          chocolate_grams?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_extra?: boolean
          name?: string
          position?: number
          product_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: true
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          change: number
          created_at: string
          id: number
          order_id: string | null
          reason: string
          stock_item_id: string
        }
        Insert: {
          change: number
          created_at?: string
          id?: number
          order_id?: string | null
          reason: string
          stock_item_id: string
        }
        Update: {
          change?: number
          created_at?: string
          id?: number
          order_id?: string | null
          reason?: string
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_variants: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          price: number
          sold_out: boolean
          updated_at: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          price: number
          sold_out?: boolean
          updated_at?: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          price?: number
          sold_out?: boolean
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_variants_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          created_at: string
          description: Json
          event_date: string | null
          id: string
          images: string[]
          is_published: boolean
          legacy_url_id: string | null
          option_name: string
          position: number
          slug: string
          sold_out: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json
          event_date?: string | null
          id?: string
          images?: string[]
          is_published?: boolean
          legacy_url_id?: string | null
          option_name: string
          position?: number
          slug: string
          sold_out?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json
          event_date?: string | null
          id?: string
          images?: string[]
          is_published?: boolean
          legacy_url_id?: string | null
          option_name?: string
          position?: number
          slug?: string
          sold_out?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      pod_add_made: { Args: { counts: Json }; Returns: undefined }
      pod_create_invoice: { Args: { order_id: string }; Returns: string }
      pod_record_sale: { Args: { customer: string; kind: string; lines: Json; note: string; price_list: string }; Returns: string }
      pod_save_order: {
        Args: { customer: string; lines: Json; needed_by: string | null; note: string | null; order_id: string | null }
        Returns: string
      }
      pod_save_invoice: {
        Args: {
          bill_to: string
          due_on: string
          invoice_id: string
          issued_on: string
          lines: Json
          notes: string
          number: number
        }
        Returns: undefined
      }
      pod_save_stock_take: { Args: { counts: Json }; Returns: undefined }
      pod_set_order_status: { Args: { order_id: string; status: string }; Returns: undefined }
      pod_undo_sale: { Args: { order_id: string }; Returns: undefined }
      receipts_cron_secret_matches: { Args: { secret: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

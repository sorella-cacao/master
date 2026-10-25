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
      [_ in never]: never
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

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
      companies: {
        Row: {
          created_at: string
          enabled_modules: Database["public"]["Enums"]["app_module"][]
          id: string
          is_active: boolean
          name: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled_modules?: Database["public"]["Enums"]["app_module"][]
          id?: string
          is_active?: boolean
          name: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled_modules?: Database["public"]["Enums"]["app_module"][]
          id?: string
          is_active?: boolean
          name?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_pricing_rules: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          discount_percent: number
          id: string
          notes: string | null
          product_name: string | null
          special_price: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          discount_percent?: number
          id?: string
          notes?: string | null
          product_name?: string | null
          special_price?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          discount_percent?: number
          id?: string
          notes?: string | null
          product_name?: string | null
          special_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_rules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          shipping_address: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          shipping_address?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          shipping_address?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          cgst_amount: number
          company_id: string
          description: string | null
          discount_percent: number
          id: string
          igst_amount: number
          invoice_id: string
          line_total: number
          position: number
          product_name: string
          quantity: number
          sgst_amount: number
          tax_percent: number
          unit_price: number
        }
        Insert: {
          cgst_amount?: number
          company_id: string
          description?: string | null
          discount_percent?: number
          id?: string
          igst_amount?: number
          invoice_id: string
          line_total?: number
          position?: number
          product_name: string
          quantity?: number
          sgst_amount?: number
          tax_percent?: number
          unit_price?: number
        }
        Update: {
          cgst_amount?: number
          company_id?: string
          description?: string | null
          discount_percent?: number
          id?: string
          igst_amount?: number
          invoice_id?: string
          line_total?: number
          position?: number
          product_name?: string
          quantity?: number
          sgst_amount?: number
          tax_percent?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          cgst_total: number
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          discount_total: number
          due_date: string | null
          grand_total: number
          id: string
          igst_total: number
          invoice_date: string
          invoice_number: string
          last_reminder_at: string | null
          notes: string | null
          sales_order_id: string | null
          sgst_total: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_total: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          cgst_total?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_total?: number
          due_date?: string | null
          grand_total?: number
          id?: string
          igst_total?: number
          invoice_date?: string
          invoice_number: string
          last_reminder_at?: string | null
          notes?: string | null
          sales_order_id?: string | null
          sgst_total?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_total?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          cgst_total?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_total?: number
          due_date?: string | null
          grand_total?: number
          id?: string
          igst_total?: number
          invoice_date?: string
          invoice_number?: string
          last_reminder_at?: string | null
          notes?: string | null
          sales_order_id?: string | null
          sgst_total?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_total?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
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
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_id: string
          company_name: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          email: string | null
          expected_close_date: string | null
          expected_value: number
          id: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          title: string
          updated_at: string
          win_probability: number
        }
        Insert: {
          company_id: string
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          expected_close_date?: string | null
          expected_value?: number
          id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          title: string
          updated_at?: string
          win_probability?: number
        }
        Update: {
          company_id?: string
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          expected_close_date?: string | null
          expected_value?: number
          id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          title?: string
          updated_at?: string
          win_probability?: number
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_date: string
          reference: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          company_id: string
          description: string | null
          discount_percent: number
          id: string
          line_total: number
          position: number
          product_name: string
          quantity: number
          quotation_id: string
          tax_percent: number
          unit_price: number
        }
        Insert: {
          company_id: string
          description?: string | null
          discount_percent?: number
          id?: string
          line_total?: number
          position?: number
          product_name: string
          quantity?: number
          quotation_id: string
          tax_percent?: number
          unit_price?: number
        }
        Update: {
          company_id?: string
          description?: string | null
          discount_percent?: number
          id?: string
          line_total?: number
          position?: number
          product_name?: string
          quantity?: number
          quotation_id?: string
          tax_percent?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          discount_total: number
          grand_total: number
          id: string
          issue_date: string
          lead_id: string | null
          notes: string | null
          quotation_number: string
          status: Database["public"]["Enums"]["quotation_status"]
          subtotal: number
          tax_total: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_total?: number
          grand_total?: number
          id?: string
          issue_date?: string
          lead_id?: string | null
          notes?: string | null
          quotation_number: string
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax_total?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_total?: number
          grand_total?: number
          id?: string
          issue_date?: string
          lead_id?: string | null
          notes?: string | null
          quotation_number?: string
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax_total?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          company_id: string
          description: string | null
          discount_percent: number
          id: string
          line_total: number
          position: number
          product_name: string
          quantity: number
          sales_order_id: string
          tax_percent: number
          unit_price: number
        }
        Insert: {
          company_id: string
          description?: string | null
          discount_percent?: number
          id?: string
          line_total?: number
          position?: number
          product_name: string
          quantity?: number
          sales_order_id: string
          tax_percent?: number
          unit_price?: number
        }
        Update: {
          company_id?: string
          description?: string | null
          discount_percent?: number
          id?: string
          line_total?: number
          position?: number
          product_name?: string
          quantity?: number
          sales_order_id?: string
          tax_percent?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string | null
          discount_total: number
          grand_total: number
          id: string
          notes: string | null
          order_date: string
          order_number: string
          quotation_id: string | null
          status: Database["public"]["Enums"]["sales_order_status"]
          subtotal: number
          tax_total: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"]
          subtotal?: number
          tax_total?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"]
          subtotal?: number
          tax_total?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: { Args: { _user_id: string }; Returns: string }
      has_company_role: {
        Args: {
          _company_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      next_doc_number: {
        Args: { _company_id: string; _prefix: string }
        Returns: string
      }
    }
    Enums: {
      app_module:
        | "sales"
        | "procurement"
        | "inventory"
        | "production"
        | "finance"
        | "hr"
      app_role:
        | "super_admin"
        | "admin"
        | "sales"
        | "procurement"
        | "production"
        | "finance"
        | "hr"
      invoice_status:
        | "draft"
        | "sent"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      lead_source:
        | "website"
        | "referral"
        | "cold_call"
        | "email"
        | "event"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "cheque"
        | "upi"
        | "card"
        | "other"
      quotation_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      sales_order_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "fulfilled"
        | "cancelled"
      subscription_plan: "trial" | "starter" | "pro" | "enterprise"
      tax_type: "intra_state" | "inter_state" | "exempt"
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
      app_module: [
        "sales",
        "procurement",
        "inventory",
        "production",
        "finance",
        "hr",
      ],
      app_role: [
        "super_admin",
        "admin",
        "sales",
        "procurement",
        "production",
        "finance",
        "hr",
      ],
      invoice_status: [
        "draft",
        "sent",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      lead_source: [
        "website",
        "referral",
        "cold_call",
        "email",
        "event",
        "other",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      payment_method: [
        "cash",
        "bank_transfer",
        "cheque",
        "upi",
        "card",
        "other",
      ],
      quotation_status: ["draft", "sent", "accepted", "rejected", "expired"],
      sales_order_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "fulfilled",
        "cancelled",
      ],
      subscription_plan: ["trial", "starter", "pro", "enterprise"],
      tax_type: ["intra_state", "inter_state", "exempt"],
    },
  },
} as const

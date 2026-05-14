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
      attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          hours_worked: number
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          attendance_date: string
          check_in?: string | null
          check_out?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          hours_worked?: number
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          hours_worked?: number
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: []
      }
      bills_of_materials: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          output_quantity: number
          output_unit: string
          product_code: string | null
          product_name: string
          status: Database["public"]["Enums"]["bom_status"]
          updated_at: string
          version: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          output_quantity?: number
          output_unit?: string
          product_code?: string | null
          product_name: string
          status?: Database["public"]["Enums"]["bom_status"]
          updated_at?: string
          version?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          output_quantity?: number
          output_unit?: string
          product_code?: string | null
          product_name?: string
          status?: Database["public"]["Enums"]["bom_status"]
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      bom_components: {
        Row: {
          bom_id: string
          company_id: string
          component_code: string | null
          component_name: string
          created_at: string
          id: string
          notes: string | null
          position: number
          quantity: number
          sub_bom_id: string | null
          unit: string
          unit_cost: number
        }
        Insert: {
          bom_id: string
          company_id: string
          component_code?: string | null
          component_name: string
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          quantity?: number
          sub_bom_id?: string | null
          unit?: string
          unit_cost?: number
        }
        Update: {
          bom_id?: string
          company_id?: string
          component_code?: string | null
          component_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          quantity?: number
          sub_bom_id?: string | null
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "bom_components_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bills_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_components_sub_bom_id_fkey"
            columns: ["sub_bom_id"]
            isOneToOne: false
            referencedRelation: "bills_of_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          code: string
          company_id: string
          created_at: string
          currency: string
          gst_rate: number | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          currency?: string
          gst_rate?: number | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          currency?: string
          gst_rate?: number | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: []
      }
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
      employees: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          ctc_annual: number
          date_of_birth: string | null
          date_of_joining: string
          department: string | null
          designation: string | null
          email: string | null
          employee_code: string
          esi_number: string | null
          full_name: string
          id: string
          ifsc: string | null
          pan: string | null
          pf_number: string | null
          phone: string | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          ctc_annual?: number
          date_of_birth?: string | null
          date_of_joining?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_code: string
          esi_number?: string | null
          full_name: string
          id?: string
          ifsc?: string | null
          pan?: string | null
          pf_number?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          ctc_annual?: number
          date_of_birth?: string | null
          date_of_joining?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_code?: string
          esi_number?: string | null
          full_name?: string
          id?: string
          ifsc?: string | null
          pan?: string | null
          pf_number?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      grn_items: {
        Row: {
          batch_no: string | null
          company_id: string
          expiry_date: string | null
          grn_id: string
          id: string
          item_id: string | null
          item_name: string
          notes: string | null
          po_item_id: string | null
          position: number
          quantity: number
          unit: string
          unit_cost: number
          warehouse_id: string | null
        }
        Insert: {
          batch_no?: string | null
          company_id: string
          expiry_date?: string | null
          grn_id: string
          id?: string
          item_id?: string | null
          item_name: string
          notes?: string | null
          po_item_id?: string | null
          position?: number
          quantity?: number
          unit?: string
          unit_cost?: number
          warehouse_id?: string | null
        }
        Update: {
          batch_no?: string | null
          company_id?: string
          expiry_date?: string | null
          grn_id?: string
          id?: string
          item_id?: string | null
          item_name?: string
          notes?: string | null
          po_item_id?: string | null
          position?: number
          quantity?: number
          unit?: string
          unit_cost?: number
          warehouse_id?: string | null
        }
        Relationships: []
      }
      grns: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          duty: number
          freight: number
          grn_number: string
          id: string
          notes: string | null
          other_landed: number
          po_id: string
          received_date: string
          status: Database["public"]["Enums"]["grn_status"]
          supplier_id: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          duty?: number
          freight?: number
          grn_number: string
          id?: string
          notes?: string | null
          other_landed?: number
          po_id: string
          received_date?: string
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          duty?: number
          freight?: number
          grn_number?: string
          id?: string
          notes?: string | null
          other_landed?: number
          po_id?: string
          received_date?: string
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: []
      }
      gst_ledger: {
        Row: {
          cgst: number
          company_id: string
          created_at: string
          entry_id: string | null
          id: string
          igst: number
          kind: Database["public"]["Enums"]["gst_kind"]
          rate: number
          sgst: number
          source_id: string | null
          source_module: string | null
          taxable_value: number
          txn_date: string
        }
        Insert: {
          cgst?: number
          company_id: string
          created_at?: string
          entry_id?: string | null
          id?: string
          igst?: number
          kind: Database["public"]["Enums"]["gst_kind"]
          rate?: number
          sgst?: number
          source_id?: string | null
          source_module?: string | null
          taxable_value?: number
          txn_date?: string
        }
        Update: {
          cgst?: number
          company_id?: string
          created_at?: string
          entry_id?: string | null
          id?: string
          igst?: number
          kind?: Database["public"]["Enums"]["gst_kind"]
          rate?: number
          sgst?: number
          source_id?: string | null
          source_module?: string | null
          taxable_value?: number
          txn_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "gst_ledger_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
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
      items: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          item_type: Database["public"]["Enums"]["item_type"]
          min_stock: number
          name: string
          reorder_qty: number
          sku: string
          standard_cost: number
          unit: string
          updated_at: string
          valuation_method: Database["public"]["Enums"]["valuation_method"]
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          item_type?: Database["public"]["Enums"]["item_type"]
          min_stock?: number
          name: string
          reorder_qty?: number
          sku: string
          standard_cost?: number
          unit?: string
          updated_at?: string
          valuation_method?: Database["public"]["Enums"]["valuation_method"]
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          item_type?: Database["public"]["Enums"]["item_type"]
          min_stock?: number
          name?: string
          reorder_qty?: number
          sku?: string
          standard_cost?: number
          unit?: string
          updated_at?: string
          valuation_method?: Database["public"]["Enums"]["valuation_method"]
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          entry_date: string
          entry_number: string
          id: string
          narration: string | null
          source_id: string | null
          source_module: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["je_status"]
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          narration?: string | null
          source_id?: string | null
          source_module?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["je_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          narration?: string | null
          source_id?: string | null
          source_module?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["je_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string
          company_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
          position: number
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
          position?: number
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
      material_consumption: {
        Row: {
          company_id: string
          consumed_at: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string | null
          material_code: string | null
          material_name: string
          notes: string | null
          quantity: number
          total_cost: number
          unit: string
          unit_cost: number
          warehouse_id: string | null
          work_order_id: string
        }
        Insert: {
          company_id: string
          consumed_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          material_code?: string | null
          material_name: string
          notes?: string | null
          quantity: number
          total_cost?: number
          unit?: string
          unit_cost?: number
          warehouse_id?: string | null
          work_order_id: string
        }
        Update: {
          company_id?: string
          consumed_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          material_code?: string | null
          material_name?: string
          notes?: string | null
          quantity?: number
          total_cost?: number
          unit?: string
          unit_cost?: number
          warehouse_id?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_consumption_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ncr_records: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          batch_no: string | null
          company_id: string
          corrective_action: string | null
          created_at: string
          created_by: string | null
          defect_description: string
          id: string
          inspection_id: string | null
          item_id: string | null
          item_name: string | null
          ncr_number: string
          preventive_action: string | null
          quantity: number
          raised_date: string
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["ncr_severity"]
          source_stage: Database["public"]["Enums"]["qc_stage"] | null
          status: Database["public"]["Enums"]["ncr_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          batch_no?: string | null
          company_id: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          defect_description: string
          id?: string
          inspection_id?: string | null
          item_id?: string | null
          item_name?: string | null
          ncr_number: string
          preventive_action?: string | null
          quantity?: number
          raised_date?: string
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["ncr_severity"]
          source_stage?: Database["public"]["Enums"]["qc_stage"] | null
          status?: Database["public"]["Enums"]["ncr_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          batch_no?: string | null
          company_id?: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          defect_description?: string
          id?: string
          inspection_id?: string | null
          item_id?: string | null
          item_name?: string | null
          ncr_number?: string
          preventive_action?: string | null
          quantity?: number
          raised_date?: string
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["ncr_severity"]
          source_stage?: Database["public"]["Enums"]["qc_stage"] | null
          status?: Database["public"]["Enums"]["ncr_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ncr_records_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "qc_inspections"
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
      payroll_items: {
        Row: {
          allowances: number
          basic: number
          company_id: string
          days_in_month: number
          days_present: number
          employee_id: string
          esi_employee: number
          esi_employer: number
          gross: number
          hra: number
          id: string
          net_pay: number
          other_deductions: number
          pf_employee: number
          pf_employer: number
          professional_tax: number
          run_id: string
          tds: number
        }
        Insert: {
          allowances?: number
          basic?: number
          company_id: string
          days_in_month?: number
          days_present?: number
          employee_id: string
          esi_employee?: number
          esi_employer?: number
          gross?: number
          hra?: number
          id?: string
          net_pay?: number
          other_deductions?: number
          pf_employee?: number
          pf_employer?: number
          professional_tax?: number
          run_id: string
          tds?: number
        }
        Update: {
          allowances?: number
          basic?: number
          company_id?: string
          days_in_month?: number
          days_present?: number
          employee_id?: string
          esi_employee?: number
          esi_employer?: number
          gross?: number
          hra?: number
          id?: string
          net_pay?: number
          other_deductions?: number
          pf_employee?: number
          pf_employer?: number
          professional_tax?: number
          run_id?: string
          tds?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          pay_date: string
          period_month: number
          period_year: number
          run_number: string
          status: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions: number
          total_esi_employee: number
          total_esi_employer: number
          total_gross: number
          total_net: number
          total_pf_employee: number
          total_pf_employer: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          pay_date?: string
          period_month: number
          period_year: number
          run_number: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions?: number
          total_esi_employee?: number
          total_esi_employer?: number
          total_gross?: number
          total_net?: number
          total_pf_employee?: number
          total_pf_employer?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          pay_date?: string
          period_month?: number
          period_year?: number
          run_number?: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions?: number
          total_esi_employee?: number
          total_esi_employer?: number
          total_gross?: number
          total_net?: number
          total_pf_employee?: number
          total_pf_employer?: number
          updated_at?: string
        }
        Relationships: []
      }
      production_logs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          event: Database["public"]["Enums"]["production_log_event"]
          from_status: Database["public"]["Enums"]["work_order_status"] | null
          id: string
          notes: string | null
          to_status: Database["public"]["Enums"]["work_order_status"] | null
          work_order_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          event: Database["public"]["Enums"]["production_log_event"]
          from_status?: Database["public"]["Enums"]["work_order_status"] | null
          id?: string
          notes?: string | null
          to_status?: Database["public"]["Enums"]["work_order_status"] | null
          work_order_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          event?: Database["public"]["Enums"]["production_log_event"]
          from_status?: Database["public"]["Enums"]["work_order_status"] | null
          id?: string
          notes?: string | null
          to_status?: Database["public"]["Enums"]["work_order_status"] | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_output: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_scrap: boolean
          item_id: string | null
          notes: string | null
          produced_at: string
          product_name: string
          quantity: number
          unit: string
          unit_cost: number
          warehouse_id: string | null
          work_order_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_scrap?: boolean
          item_id?: string | null
          notes?: string | null
          produced_at?: string
          product_name: string
          quantity: number
          unit?: string
          unit_cost?: number
          warehouse_id?: string | null
          work_order_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_scrap?: boolean
          item_id?: string | null
          notes?: string | null
          produced_at?: string
          product_name?: string
          quantity?: number
          unit?: string
          unit_cost?: number
          warehouse_id?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_output_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
          username: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
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
      purchase_indent_items: {
        Row: {
          company_id: string
          id: string
          indent_id: string
          item_code: string | null
          item_id: string | null
          item_name: string
          notes: string | null
          position: number
          quantity: number
          unit: string
        }
        Insert: {
          company_id: string
          id?: string
          indent_id: string
          item_code?: string | null
          item_id?: string | null
          item_name: string
          notes?: string | null
          position?: number
          quantity?: number
          unit?: string
        }
        Update: {
          company_id?: string
          id?: string
          indent_id?: string
          item_code?: string | null
          item_id?: string | null
          item_name?: string
          notes?: string | null
          position?: number
          quantity?: number
          unit?: string
        }
        Relationships: []
      }
      purchase_indents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          indent_number: string
          notes: string | null
          required_by: string | null
          source: string | null
          status: Database["public"]["Enums"]["indent_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          indent_number: string
          notes?: string | null
          required_by?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["indent_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          indent_number?: string
          notes?: string | null
          required_by?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["indent_status"]
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          company_id: string
          id: string
          item_code: string | null
          item_id: string | null
          item_name: string
          line_total: number
          po_id: string
          position: number
          quantity: number
          received_quantity: number
          tax_percent: number
          unit: string
          unit_price: number
        }
        Insert: {
          company_id: string
          id?: string
          item_code?: string | null
          item_id?: string | null
          item_name: string
          line_total?: number
          po_id: string
          position?: number
          quantity?: number
          received_quantity?: number
          tax_percent?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          company_id?: string
          id?: string
          item_code?: string | null
          item_id?: string | null
          item_name?: string
          line_total?: number
          po_id?: string
          position?: number
          quantity?: number
          received_quantity?: number
          tax_percent?: number
          unit?: string
          unit_price?: number
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          approval_level: number
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          expected_date: string | null
          freight: number
          grand_total: number
          id: string
          indent_id: string | null
          notes: string | null
          order_date: string
          po_number: string
          rfq_id: string | null
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number
          supplier_id: string
          tax_total: number
          updated_at: string
        }
        Insert: {
          approval_level?: number
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          freight?: number
          grand_total?: number
          id?: string
          indent_id?: string | null
          notes?: string | null
          order_date?: string
          po_number: string
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id: string
          tax_total?: number
          updated_at?: string
        }
        Update: {
          approval_level?: number
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          freight?: number
          grand_total?: number
          id?: string
          indent_id?: string | null
          notes?: string | null
          order_date?: string
          po_number?: string
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id?: string
          tax_total?: number
          updated_at?: string
        }
        Relationships: []
      }
      qc_inspection_items: {
        Row: {
          actual_value: string | null
          company_id: string
          created_at: string
          expected_value: string | null
          id: string
          inspection_id: string
          notes: string | null
          parameter: string
          passed: boolean
          position: number
        }
        Insert: {
          actual_value?: string | null
          company_id: string
          created_at?: string
          expected_value?: string | null
          id?: string
          inspection_id: string
          notes?: string | null
          parameter: string
          passed?: boolean
          position?: number
        }
        Update: {
          actual_value?: string | null
          company_id?: string
          created_at?: string
          expected_value?: string | null
          id?: string
          inspection_id?: string
          notes?: string | null
          parameter?: string
          passed?: boolean
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "qc_inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "qc_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_inspections: {
        Row: {
          batch_no: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          inspection_date: string
          inspection_number: string
          inspector_id: string | null
          inspector_name: string | null
          item_id: string | null
          item_name: string | null
          quantity_accepted: number
          quantity_inspected: number
          quantity_rejected: number
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          remarks: string | null
          result: Database["public"]["Enums"]["qc_result"]
          stage: Database["public"]["Enums"]["qc_stage"]
          updated_at: string
        }
        Insert: {
          batch_no?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_date?: string
          inspection_number: string
          inspector_id?: string | null
          inspector_name?: string | null
          item_id?: string | null
          item_name?: string | null
          quantity_accepted?: number
          quantity_inspected?: number
          quantity_rejected?: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          remarks?: string | null
          result?: Database["public"]["Enums"]["qc_result"]
          stage: Database["public"]["Enums"]["qc_stage"]
          updated_at?: string
        }
        Update: {
          batch_no?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_date?: string
          inspection_number?: string
          inspector_id?: string | null
          inspector_name?: string | null
          item_id?: string | null
          item_name?: string | null
          quantity_accepted?: number
          quantity_inspected?: number
          quantity_rejected?: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          remarks?: string | null
          result?: Database["public"]["Enums"]["qc_result"]
          stage?: Database["public"]["Enums"]["qc_stage"]
          updated_at?: string
        }
        Relationships: []
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
      rfq_items: {
        Row: {
          company_id: string
          id: string
          item_code: string | null
          item_id: string | null
          item_name: string
          position: number
          quantity: number
          rfq_id: string
          unit: string
        }
        Insert: {
          company_id: string
          id?: string
          item_code?: string | null
          item_id?: string | null
          item_name: string
          position?: number
          quantity?: number
          rfq_id: string
          unit?: string
        }
        Update: {
          company_id?: string
          id?: string
          item_code?: string | null
          item_id?: string | null
          item_name?: string
          position?: number
          quantity?: number
          rfq_id?: string
          unit?: string
        }
        Relationships: []
      }
      rfq_supplier_quotes: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_selected: boolean
          lead_time_days: number
          notes: string | null
          rfq_id: string
          rfq_item_id: string
          supplier_id: string
          unit_price: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_selected?: boolean
          lead_time_days?: number
          notes?: string | null
          rfq_id: string
          rfq_item_id: string
          supplier_id: string
          unit_price?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_selected?: boolean
          lead_time_days?: number
          notes?: string | null
          rfq_id?: string
          rfq_item_id?: string
          supplier_id?: string
          unit_price?: number
        }
        Relationships: []
      }
      rfqs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          indent_id: string | null
          issue_date: string
          notes: string | null
          rfq_number: string
          status: Database["public"]["Enums"]["rfq_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          indent_id?: string | null
          issue_date?: string
          notes?: string | null
          rfq_number: string
          status?: Database["public"]["Enums"]["rfq_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          indent_id?: string | null
          issue_date?: string
          notes?: string | null
          rfq_number?: string
          status?: Database["public"]["Enums"]["rfq_status"]
          updated_at?: string
        }
        Relationships: []
      }
      salary_structures: {
        Row: {
          basic: number
          company_id: string
          conveyance: number
          created_at: string
          effective_from: string
          employee_id: string
          esi_employee_percent: number
          esi_employer_percent: number
          hra: number
          id: string
          notes: string | null
          other_allowances: number
          pf_employee_percent: number
          pf_employer_percent: number
          professional_tax: number
          special_allowance: number
          updated_at: string
        }
        Insert: {
          basic?: number
          company_id: string
          conveyance?: number
          created_at?: string
          effective_from?: string
          employee_id: string
          esi_employee_percent?: number
          esi_employer_percent?: number
          hra?: number
          id?: string
          notes?: string | null
          other_allowances?: number
          pf_employee_percent?: number
          pf_employer_percent?: number
          professional_tax?: number
          special_allowance?: number
          updated_at?: string
        }
        Update: {
          basic?: number
          company_id?: string
          conveyance?: number
          created_at?: string
          effective_from?: string
          employee_id?: string
          esi_employee_percent?: number
          esi_employer_percent?: number
          hra?: number
          id?: string
          notes?: string | null
          other_allowances?: number
          pf_employee_percent?: number
          pf_employer_percent?: number
          professional_tax?: number
          special_allowance?: number
          updated_at?: string
        }
        Relationships: []
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
      stock_batches: {
        Row: {
          batch_no: string
          company_id: string
          created_at: string
          expiry_date: string | null
          id: string
          item_id: string
          landed_cost_per_unit: number
          qty_received: number
          qty_remaining: number
          received_at: string
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          batch_no: string
          company_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id: string
          landed_cost_per_unit?: number
          qty_received?: number
          qty_remaining?: number
          received_at?: string
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          batch_no?: string
          company_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id?: string
          landed_cost_per_unit?: number
          qty_received?: number
          qty_remaining?: number
          received_at?: string
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: []
      }
      stock_transactions: {
        Row: {
          batch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          duty: number
          freight: number
          id: string
          item_id: string
          notes: string | null
          occurred_at: string
          other_landed: number
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_value: number
          txn_type: Database["public"]["Enums"]["stock_txn_type"]
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          batch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          duty?: number
          freight?: number
          id?: string
          item_id: string
          notes?: string | null
          occurred_at?: string
          other_landed?: number
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          total_value?: number
          txn_type: Database["public"]["Enums"]["stock_txn_type"]
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          batch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          duty?: number
          freight?: number
          id?: string
          item_id?: string
          notes?: string | null
          occurred_at?: string
          other_landed?: number
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_value?: number
          txn_type?: Database["public"]["Enums"]["stock_txn_type"]
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_date: string
          payment_number: string
          reference: string | null
          supplier_id: string
          vinv_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          payment_number: string
          reference?: string | null
          supplier_id: string
          vinv_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          payment_number?: string
          reference?: string | null
          supplier_id?: string
          vinv_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          code: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean
          lead_time_days: number
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number
          updated_at?: string
        }
        Relationships: []
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
      vendor_invoice_items: {
        Row: {
          company_id: string
          id: string
          item_name: string
          line_total: number
          po_item_id: string | null
          position: number
          quantity: number
          tax_percent: number
          unit: string
          unit_price: number
          vinv_id: string
        }
        Insert: {
          company_id: string
          id?: string
          item_name: string
          line_total?: number
          po_item_id?: string | null
          position?: number
          quantity?: number
          tax_percent?: number
          unit?: string
          unit_price?: number
          vinv_id: string
        }
        Update: {
          company_id?: string
          id?: string
          item_name?: string
          line_total?: number
          po_item_id?: string | null
          position?: number
          quantity?: number
          tax_percent?: number
          unit?: string
          unit_price?: number
          vinv_id?: string
        }
        Relationships: []
      }
      vendor_invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          grand_total: number
          grn_id: string | null
          id: string
          invoice_date: string
          match_notes: string | null
          match_status: string
          notes: string | null
          po_id: string | null
          status: Database["public"]["Enums"]["vinv_status"]
          subtotal: number
          supplier_id: string
          supplier_invoice_no: string | null
          tax_total: number
          updated_at: string
          vinv_number: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          grand_total?: number
          grn_id?: string | null
          id?: string
          invoice_date?: string
          match_notes?: string | null
          match_status?: string
          notes?: string | null
          po_id?: string | null
          status?: Database["public"]["Enums"]["vinv_status"]
          subtotal?: number
          supplier_id: string
          supplier_invoice_no?: string | null
          tax_total?: number
          updated_at?: string
          vinv_number: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          grand_total?: number
          grn_id?: string | null
          id?: string
          invoice_date?: string
          match_notes?: string | null
          match_status?: string
          notes?: string | null
          po_id?: string | null
          status?: Database["public"]["Enums"]["vinv_status"]
          subtotal?: number
          supplier_id?: string
          supplier_invoice_no?: string | null
          tax_total?: number
          updated_at?: string
          vinv_number?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          auto_triggered: boolean
          bom_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          planned_quantity: number
          priority: number
          produced_quantity: number
          product_name: string
          sales_order_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          unit: string
          updated_at: string
          wo_number: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          auto_triggered?: boolean
          bom_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          planned_quantity?: number
          priority?: number
          produced_quantity?: number
          product_name: string
          sales_order_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          unit?: string
          updated_at?: string
          wo_number: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          auto_triggered?: boolean
          bom_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          planned_quantity?: number
          priority?: number
          produced_quantity?: number
          product_name?: string
          sales_order_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          unit?: string
          updated_at?: string
          wo_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bills_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_balances: {
        Args: { _company_id: string; _from?: string; _to?: string }
        Returns: {
          account_id: string
          balance: number
          code: string
          credit: number
          debit: number
          name: string
          type: Database["public"]["Enums"]["account_type"]
        }[]
      }
      acct: { Args: { _code: string; _company_id: string }; Returns: string }
      explode_bom: {
        Args: { _bom_id: string; _qty: number }
        Returns: {
          material_code: string
          material_name: string
          total_cost: number
          total_quantity: number
          unit: string
        }[]
      }
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
      item_stock_levels: {
        Args: { _company_id: string }
        Returns: {
          item_id: string
          on_hand: number
          value: number
          warehouse_id: string
        }[]
      }
      next_doc_number: {
        Args: { _company_id: string; _prefix: string }
        Returns: string
      }
      next_je_number: { Args: { _company_id: string }; Returns: string }
      next_payroll_number: { Args: { _company_id: string }; Returns: string }
      next_proc_number: {
        Args: { _company_id: string; _prefix: string }
        Returns: string
      }
      next_wo_number: { Args: { _company_id: string }; Returns: string }
      post_journal: {
        Args: {
          _company_id: string
          _date: string
          _lines: Json
          _module: string
          _narration: string
          _src_id: string
          _src_type: string
        }
        Returns: string
      }
      post_stock_issue: {
        Args: {
          _company_id: string
          _item_id: string
          _notes?: string
          _quantity: number
          _ref_id?: string
          _ref_type?: string
          _txn_type?: Database["public"]["Enums"]["stock_txn_type"]
          _warehouse_id: string
        }
        Returns: number
      }
      post_stock_receipt: {
        Args: {
          _batch_no: string
          _company_id: string
          _duty?: number
          _expiry?: string
          _freight?: number
          _item_id: string
          _notes?: string
          _other?: number
          _quantity: number
          _ref_id?: string
          _ref_type?: string
          _unit_cost: number
          _warehouse_id: string
        }
        Returns: string
      }
      seed_chart_of_accounts: {
        Args: { _company_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      app_module:
        | "sales"
        | "procurement"
        | "inventory"
        | "production"
        | "finance"
        | "hr"
        | "reports"
        | "quality"
        | "maintenance"
      app_role:
        | "super_admin"
        | "admin"
        | "sales"
        | "procurement"
        | "production"
        | "finance"
        | "hr"
        | "quality"
        | "maintenance"
      attendance_status:
        | "present"
        | "absent"
        | "half_day"
        | "leave"
        | "holiday"
        | "week_off"
      bom_status: "draft" | "active" | "archived"
      employee_status: "active" | "on_leave" | "resigned" | "terminated"
      grn_status: "draft" | "posted" | "cancelled"
      gst_kind: "output" | "input"
      indent_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "converted"
        | "closed"
      invoice_status:
        | "draft"
        | "sent"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      item_type:
        | "raw_material"
        | "wip"
        | "finished_good"
        | "consumable"
        | "service"
      je_status: "draft" | "posted" | "reversed"
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
      ncr_severity: "minor" | "major" | "critical"
      ncr_status: "open" | "investigating" | "resolved" | "closed"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "cheque"
        | "upi"
        | "card"
        | "other"
      payroll_run_status: "draft" | "processed" | "posted"
      po_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "sent"
        | "partially_received"
        | "received"
        | "closed"
        | "cancelled"
      production_log_event:
        | "created"
        | "released"
        | "started"
        | "paused"
        | "resumed"
        | "completed"
        | "cancelled"
        | "note"
      qc_result: "pending" | "accepted" | "rejected" | "accepted_with_deviation"
      qc_stage: "incoming" | "in_process" | "finished"
      quotation_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      rfq_status: "draft" | "sent" | "quoted" | "closed" | "cancelled"
      sales_order_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "fulfilled"
        | "cancelled"
      stock_txn_type:
        | "receipt"
        | "issue"
        | "transfer_in"
        | "transfer_out"
        | "adjustment"
        | "production_in"
        | "production_out"
        | "opening"
      subscription_plan: "trial" | "starter" | "pro" | "enterprise"
      tax_type: "intra_state" | "inter_state" | "exempt"
      valuation_method: "fifo" | "weighted_average"
      vinv_status:
        | "draft"
        | "matched"
        | "approved"
        | "paid"
        | "partially_paid"
        | "disputed"
        | "cancelled"
      work_order_status:
        | "planned"
        | "released"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      app_module: [
        "sales",
        "procurement",
        "inventory",
        "production",
        "finance",
        "hr",
        "reports",
        "quality",
        "maintenance",
      ],
      app_role: [
        "super_admin",
        "admin",
        "sales",
        "procurement",
        "production",
        "finance",
        "hr",
        "quality",
        "maintenance",
      ],
      attendance_status: [
        "present",
        "absent",
        "half_day",
        "leave",
        "holiday",
        "week_off",
      ],
      bom_status: ["draft", "active", "archived"],
      employee_status: ["active", "on_leave", "resigned", "terminated"],
      grn_status: ["draft", "posted", "cancelled"],
      gst_kind: ["output", "input"],
      indent_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "converted",
        "closed",
      ],
      invoice_status: [
        "draft",
        "sent",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      item_type: [
        "raw_material",
        "wip",
        "finished_good",
        "consumable",
        "service",
      ],
      je_status: ["draft", "posted", "reversed"],
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
      ncr_severity: ["minor", "major", "critical"],
      ncr_status: ["open", "investigating", "resolved", "closed"],
      payment_method: [
        "cash",
        "bank_transfer",
        "cheque",
        "upi",
        "card",
        "other",
      ],
      payroll_run_status: ["draft", "processed", "posted"],
      po_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "sent",
        "partially_received",
        "received",
        "closed",
        "cancelled",
      ],
      production_log_event: [
        "created",
        "released",
        "started",
        "paused",
        "resumed",
        "completed",
        "cancelled",
        "note",
      ],
      qc_result: ["pending", "accepted", "rejected", "accepted_with_deviation"],
      qc_stage: ["incoming", "in_process", "finished"],
      quotation_status: ["draft", "sent", "accepted", "rejected", "expired"],
      rfq_status: ["draft", "sent", "quoted", "closed", "cancelled"],
      sales_order_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "fulfilled",
        "cancelled",
      ],
      stock_txn_type: [
        "receipt",
        "issue",
        "transfer_in",
        "transfer_out",
        "adjustment",
        "production_in",
        "production_out",
        "opening",
      ],
      subscription_plan: ["trial", "starter", "pro", "enterprise"],
      tax_type: ["intra_state", "inter_state", "exempt"],
      valuation_method: ["fifo", "weighted_average"],
      vinv_status: [
        "draft",
        "matched",
        "approved",
        "paid",
        "partially_paid",
        "disputed",
        "cancelled",
      ],
      work_order_status: [
        "planned",
        "released",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

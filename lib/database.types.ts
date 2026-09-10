export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          id: string;
          plan: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id: string;
          plan?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          plan?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          closing_day: number | null;
          color: string | null;
          created_at: string;
          due_day: number | null;
          emoji: string | null;
          id: string;
          legacy_key: string;
          limit_amount: number | null;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          closing_day?: number | null;
          color?: string | null;
          created_at?: string;
          due_day?: number | null;
          emoji?: string | null;
          id?: string;
          legacy_key: string;
          limit_amount?: number | null;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          closing_day?: number | null;
          color?: string | null;
          created_at?: string;
          due_day?: number | null;
          emoji?: string | null;
          id?: string;
          legacy_key?: string;
          limit_amount?: number | null;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      card_invoices: {
        Row: {
          billing_month: string;
          card_id: string;
          closed_at: string | null;
          created_at: string;
          cycle_end: string;
          cycle_start: string;
          due_date: string;
          id: string;
          paid_amount: number;
          paid_at: string | null;
          posted_amount: number;
          status: "OPEN" | "CLOSED" | "PARTIALLY_PAID" | "PAID";
          total_amount: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          billing_month: string;
          card_id: string;
          closed_at?: string | null;
          created_at?: string;
          cycle_end: string;
          cycle_start: string;
          due_date: string;
          id?: string;
          paid_amount?: number;
          paid_at?: string | null;
          posted_amount?: number;
          status?: "OPEN" | "CLOSED" | "PARTIALLY_PAID" | "PAID";
          total_amount?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          billing_month?: string;
          card_id?: string;
          closed_at?: string | null;
          created_at?: string;
          cycle_end?: string;
          cycle_start?: string;
          due_date?: string;
          id?: string;
          paid_amount?: number;
          paid_at?: string | null;
          posted_amount?: number;
          status?: "OPEN" | "CLOSED" | "PARTIALLY_PAID" | "PAID";
          total_amount?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_invoices_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "card_invoices_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          idempotency_key: string | null;
          invoice_id: string;
          method: "PIX" | "DEBIT" | "TRANSFER" | "CASH" | "OTHER";
          notes: string | null;
          paid_at: string;
          source: "MANUAL" | "IMPORT" | "MIGRATION";
          status: "CONFIRMED" | "VOIDED";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          invoice_id: string;
          method?: "PIX" | "DEBIT" | "TRANSFER" | "CASH" | "OTHER";
          notes?: string | null;
          paid_at?: string;
          source?: "MANUAL" | "IMPORT" | "MIGRATION";
          status?: "CONFIRMED" | "VOIDED";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          invoice_id?: string;
          method?: "PIX" | "DEBIT" | "TRANSFER" | "CASH" | "OTHER";
          notes?: string | null;
          paid_at?: string;
          source?: "MANUAL" | "IMPORT" | "MIGRATION";
          status?: "CONFIRMED" | "VOIDED";
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "card_invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      category_budgets: {
        Row: {
          alert_threshold_percent: number;
          amount: number;
          category_id: string;
          competence_month: string;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          alert_threshold_percent?: number;
          amount: number;
          category_id: string;
          competence_month: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          alert_threshold_percent?: number;
          amount?: number;
          category_id?: string;
          competence_month?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "category_budgets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          icon: string;
          id: string;
          kind: "expense" | "income";
          label: string;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          icon?: string;
          id?: string;
          kind?: "expense" | "income";
          label: string;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          icon?: string;
          id?: string;
          kind?: "expense" | "income";
          label?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      dependents: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dependents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      dependent_settlements: {
        Row: {
          amount: number;
          competence_month: string;
          created_at: string;
          dependent_id: string;
          id: string;
          idempotency_key: string | null;
          method: "PIX" | "TRANSFER" | "CASH" | "OTHER";
          notes: string | null;
          settled_at: string;
          source: "MANUAL" | "IMPORT" | "MIGRATION";
          status: "CONFIRMED" | "VOIDED";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          competence_month: string;
          created_at?: string;
          dependent_id: string;
          id?: string;
          idempotency_key?: string | null;
          method?: "PIX" | "TRANSFER" | "CASH" | "OTHER";
          notes?: string | null;
          settled_at?: string;
          source?: "MANUAL" | "IMPORT" | "MIGRATION";
          status?: "CONFIRMED" | "VOIDED";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          competence_month?: string;
          created_at?: string;
          dependent_id?: string;
          id?: string;
          idempotency_key?: string | null;
          method?: "PIX" | "TRANSFER" | "CASH" | "OTHER";
          notes?: string | null;
          settled_at?: string;
          source?: "MANUAL" | "IMPORT" | "MIGRATION";
          status?: "CONFIRMED" | "VOIDED";
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dependent_settlements_dependent_id_fkey";
            columns: ["dependent_id"];
            isOneToOne: false;
            referencedRelation: "dependents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dependent_settlements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount: number;
          card_id: string | null;
          category: string | null;
          created_at: string;
          day: number;
          dependent_id: string | null;
          description: string;
          direct_subscription: boolean;
          group_id: string | null;
          id: string;
          import_signature: string | null;
          invoice_id: string | null;
          installment_number: number;
          installments_total: number;
          is_variable: boolean;
          month_label: string | null;
          month_start: string;
          notes: string | null;
          owner: string | null;
          recurring: boolean;
          split_with: string[];
          status: "PAGO" | "PENDENTE" | "CONFIRMADO";
          transaction_date: string;
          type: "income" | "fixed" | "card";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          card_id?: string | null;
          category?: string | null;
          created_at?: string;
          day?: number;
          dependent_id?: string | null;
          description: string;
          direct_subscription?: boolean;
          group_id?: string | null;
          id?: string;
          import_signature?: string | null;
          invoice_id?: string | null;
          installment_number?: number;
          installments_total?: number;
          is_variable?: boolean;
          month_label?: string | null;
          month_start: string;
          notes?: string | null;
          owner?: string | null;
          recurring?: boolean;
          split_with?: string[];
          status?: "PAGO" | "PENDENTE" | "CONFIRMADO";
          transaction_date: string;
          type: "income" | "fixed" | "card";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          card_id?: string | null;
          category?: string | null;
          created_at?: string;
          day?: number;
          dependent_id?: string | null;
          description?: string;
          direct_subscription?: boolean;
          group_id?: string | null;
          id?: string;
          import_signature?: string | null;
          invoice_id?: string | null;
          installment_number?: number;
          installments_total?: number;
          is_variable?: boolean;
          month_label?: string | null;
          month_start?: string;
          notes?: string | null;
          owner?: string | null;
          recurring?: boolean;
          split_with?: string[];
          status?: "PAGO" | "PENDENTE" | "CONFIRMADO";
          transaction_date?: string | null;
          type?: "income" | "fixed" | "card";
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_dependent_id_fkey";
            columns: ["dependent_id"];
            isOneToOne: false;
            referencedRelation: "dependents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "card_invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Row"];

export type TablesInsert<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Insert"];

export type TablesUpdate<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Update"];

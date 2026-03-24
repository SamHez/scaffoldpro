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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by: string
          id: string
          id_tin_no: string | null
          name: string
          nickname: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          id_tin_no?: string | null
          name: string
          nickname?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          id_tin_no?: string | null
          name?: string
          nickname?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          available_stock: number
          created_at: string
          id: string
          item_name: string
          total_stock: number
          updated_at: string
        }
        Insert: {
          available_stock?: number
          created_at?: string
          id?: string
          item_name: string
          total_stock?: number
          updated_at?: string
        }
        Update: {
          available_stock?: number
          created_at?: string
          id?: string
          item_name?: string
          total_stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rentals: {
        Row: {
          balance_due: number | null
          client_id: string
          connectors: number
          country: string | null
          created_at: string
          created_by: string
          district: string | null
          document_image_url: string | null
          expected_days: number
          id: string
          legs: number
          num_chopsticks: number
          num_scaffoldings: number
          paid_days: number
          pickup_person_name: string
          plate_number: string | null
          plates: number
          price_per_scaffolding: number
          province: string | null
          rented_date: string
          returned_connectors: number | null
          returned_date: string | null
          returned_legs: number | null
          returned_num_chopsticks: number | null
          returned_num_scaffoldings: number | null
          returned_plates: number | null
          returned_timbers: number | null
          returned_tubes_1m: number | null
          returned_tubes_3m: number | null
          returned_tubes_4m: number | null
          returned_tubes_6m: number | null
          status: Database["public"]["Enums"]["rental_status"]
          timbers: number
          total_paid: number | null
          tubes_1m: number | null
          tubes_3m: number | null
          tubes_4m: number | null
          tubes_6m: number | null
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          balance_due?: number | null
          client_id: string
          connectors: number
          country?: string | null
          created_at?: string
          created_by: string
          district?: string | null
          document_image_url?: string | null
          expected_days: number
          id?: string
          legs: number
          num_chopsticks: number
          num_scaffoldings: number
          paid_days: number
          pickup_person_name: string
          plate_number?: string | null
          plates: number
          price_per_scaffolding: number
          province?: string | null
          rented_date?: string
          returned_connectors?: number | null
          returned_date?: string | null
          returned_legs?: number | null
          returned_num_chopsticks?: number | null
          returned_num_scaffoldings?: number | null
          returned_plates?: number | null
          returned_timbers?: number | null
          returned_tubes_1m?: number | null
          returned_tubes_3m?: number | null
          returned_tubes_4m?: number | null
          returned_tubes_6m?: number | null
          status?: Database["public"]["Enums"]["rental_status"]
          timbers: number
          total_paid?: number | null
          tubes_1m?: number | null
          tubes_3m?: number | null
          tubes_4m?: number | null
          tubes_6m?: number | null
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          balance_due?: number | null
          client_id?: string
          connectors?: number
          country?: string | null
          created_at?: string
          created_by?: string
          district?: string | null
          document_image_url?: string | null
          expected_days?: number
          id?: string
          legs?: number
          num_chopsticks?: number
          num_scaffoldings?: number
          paid_days?: number
          pickup_person_name?: string
          plate_number?: string | null
          plates?: number
          price_per_scaffolding?: number
          province?: string | null
          rented_date?: string
          returned_connectors?: number | null
          returned_date?: string | null
          returned_legs?: number | null
          returned_num_chopsticks?: number | null
          returned_num_scaffoldings?: number | null
          returned_plates?: number | null
          returned_timbers?: number | null
          returned_tubes_1m?: number | null
          returned_tubes_3m?: number | null
          returned_tubes_4m?: number | null
          returned_tubes_6m?: number | null
          status?: Database["public"]["Enums"]["rental_status"]
          timbers?: number
          total_paid?: number | null
          tubes_1m?: number | null
          tubes_3m?: number | null
          tubes_4m?: number | null
          tubes_6m?: number | null
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rentals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ceo_or_coo: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      rental_status: "RENTED" | "RETURNED"
      user_role: "CEO" | "COO" | "EMPLOYEE"
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
      rental_status: ["RENTED", "RETURNED"],
      user_role: ["CEO", "COO", "EMPLOYEE"],
    },
  },
} as const

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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_preferences: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          id: string
          payload: Json
          preference_key: string
          revision: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          payload?: Json
          preference_key: string
          revision?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          payload?: Json
          preference_key?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_preferences_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          id: string
          local_date: string
          payload: Json
          profile_id: string
          revision: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          local_date: string
          payload?: Json
          profile_id: string
          revision?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          local_date?: string
          payload?: Json
          profile_id?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      defyn_profiles: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          payload: Json
          revision: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          name: string
          payload?: Json
          revision?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          payload?: Json
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "defyn_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      hydration_entries: {
        Row: {
          account_id: string
          amount_ml: number
          created_at: string
          deleted_at: string | null
          id: string
          local_date: string
          occurred_at: string
          payload: Json
          profile_id: string
          revision: number
          updated_at: string
        }
        Insert: {
          account_id: string
          amount_ml: number
          created_at?: string
          deleted_at?: string | null
          id: string
          local_date: string
          occurred_at: string
          payload?: Json
          profile_id: string
          revision?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount_ml?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          local_date?: string
          occurred_at?: string
          payload?: Json
          profile_id?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hydration_entries_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      media_metadata: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          id: string
          kind: string
          mime_type: string | null
          payload: Json
          profile_id: string
          revision: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          kind: string
          mime_type?: string | null
          payload?: Json
          profile_id: string
          revision?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          payload?: Json
          profile_id?: string
          revision?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_metadata_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      nutrition_summaries: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          id: string
          local_date: string
          payload: Json
          profile_id: string
          revision: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          local_date: string
          payload?: Json
          profile_id: string
          revision?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          local_date?: string
          payload?: Json
          profile_id?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_summaries_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      nutrition_targets: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          ends_at: string | null
          id: string
          payload: Json
          profile_id: string
          revision: number
          starts_at: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id: string
          payload?: Json
          profile_id: string
          revision?: number
          starts_at: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: string
          payload?: Json
          profile_id?: string
          revision?: number
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_targets_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      profile_settings: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          id: string
          payload: Json
          profile_id: string
          revision: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          payload?: Json
          profile_id: string
          revision?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          payload?: Json
          profile_id?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_settings_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: true
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      progress_records: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          id: string
          local_date: string
          measurements: Json | null
          occurred_at: string
          payload: Json
          profile_id: string
          revision: number
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          local_date: string
          measurements?: Json | null
          occurred_at: string
          payload?: Json
          profile_id: string
          revision?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          local_date?: string
          measurements?: Json | null
          occurred_at?: string
          payload?: Json
          profile_id?: string
          revision?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_records_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      routine_days: {
        Row: {
          account_id: string
          created_at: string
          day_of_week: number
          deleted_at: string | null
          id: string
          payload: Json
          profile_id: string
          revision: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          day_of_week: number
          deleted_at?: string | null
          id: string
          payload?: Json
          profile_id: string
          revision?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          day_of_week?: number
          deleted_at?: string | null
          id?: string
          payload?: Json
          profile_id?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_days_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      sleep_records: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          id: string
          local_date: string
          payload: Json
          profile_id: string
          revision: number
          sleep_started_at: string
          updated_at: string
          woke_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          local_date: string
          payload?: Json
          profile_id: string
          revision?: number
          sleep_started_at: string
          updated_at?: string
          woke_at: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          local_date?: string
          payload?: Json
          profile_id?: string
          revision?: number
          sleep_started_at?: string
          updated_at?: string
          woke_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_records_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      training_plans: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          id: string
          payload: Json
          profile_id: string
          revision: number
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          payload?: Json
          profile_id: string
          revision?: number
          status: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          payload?: Json
          profile_id?: string
          revision?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          local_date: string
          payload: Json
          plan_id: string | null
          profile_id: string
          revision: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id: string
          local_date: string
          payload?: Json
          plan_id?: string | null
          profile_id: string
          revision?: number
          started_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          local_date?: string
          payload?: Json
          plan_id?: string | null
          profile_id?: string
          revision?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_account_id_plan_id_fkey"
            columns: ["account_id", "plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "workout_sessions_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          account_id: string
          created_at: string
          deleted_at: string | null
          exercise_id: string
          id: string
          payload: Json
          profile_id: string
          revision: number
          session_id: string
          set_index: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          deleted_at?: string | null
          exercise_id: string
          id: string
          payload?: Json
          profile_id: string
          revision?: number
          session_id: string
          set_index: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          deleted_at?: string | null
          exercise_id?: string
          id?: string
          payload?: Json
          profile_id?: string
          revision?: number
          session_id?: string
          set_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_account_id_profile_id_fkey"
            columns: ["account_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "defyn_profiles"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "workout_sets_account_id_session_id_fkey"
            columns: ["account_id", "session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["account_id", "id"]
          },
        ]
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
    Enums: {},
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      athletes: {
        Row: {
          club_id: string
          created_at: string | null
          date_of_birth: string | null
          emergency_contact: string | null
          height_cm: number | null
          id: string
          position: string | null
          profile_id: string
          sport: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          height_cm?: number | null
          id?: string
          position?: string | null
          profile_id: string
          sport?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          height_cm?: number | null
          id?: string
          position?: string | null
          profile_id?: string
          sport?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          athlete_id: string
          club_id: string
          created_at: string | null
          id: string
          notes: string | null
          session_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          club_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          session_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          club_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          session_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      batch_athletes: {
        Row: {
          assigned_at: string
          athlete_id: string
          batch_id: string
          id: string
        }
        Insert: {
          assigned_at?: string
          athlete_id: string
          batch_id: string
          id?: string
        }
        Update: {
          assigned_at?: string
          athlete_id?: string
          batch_id?: string
          id?: string
        }
        Relationships: []
      }
      batches: {
        Row: {
          club_id: string
          coach_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          admin_id: string | null
          club_code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          club_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          club_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_athletes: {
        Row: {
          assigned_at: string | null
          athlete_id: string
          coach_id: string
          id: string
        }
        Insert: {
          assigned_at?: string | null
          athlete_id: string
          coach_id: string
          id?: string
        }
        Update: {
          assigned_at?: string | null
          athlete_id?: string
          coach_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_athletes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_athletes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          certification: string | null
          club_id: string
          created_at: string | null
          experience_years: number | null
          id: string
          profile_id: string
          specialization: string | null
          updated_at: string | null
        }
        Insert: {
          certification?: string | null
          club_id: string
          created_at?: string | null
          experience_years?: number | null
          id?: string
          profile_id: string
          specialization?: string | null
          updated_at?: string | null
        }
        Update: {
          certification?: string | null
          club_id?: string
          created_at?: string | null
          experience_years?: number | null
          id?: string
          profile_id?: string
          specialization?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          athlete_id: string
          coach_completed: boolean | null
          completed_by_coach_at: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          progress_percentage: number | null
          status: string | null
          target_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          coach_completed?: boolean | null
          completed_by_coach_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          progress_percentage?: number | null
          status?: string | null
          target_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          coach_completed?: boolean | null
          completed_by_coach_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          progress_percentage?: number | null
          status?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          athlete_id: string
          batch_id: string | null
          club_id: string
          coach_id: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          session_date: string
          session_group_id: string | null
          session_type: string | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          batch_id?: string | null
          club_id: string
          coach_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          session_date: string
          session_group_id?: string | null
          session_type?: string | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          batch_id?: string | null
          club_id?: string
          coach_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          session_date?: string
          session_group_id?: string | null
          session_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          club_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          club_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          club_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          attempts: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          last_attempt: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          last_attempt?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          last_attempt?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rpe_logs: {
        Row: {
          activity_type: string | null
          athlete_id: string
          club_id: string
          coach_rpe: number | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          log_date: string
          notes: string | null
          rpe_score: number | null
          updated_at: string | null
        }
        Insert: {
          activity_type?: string | null
          athlete_id: string
          club_id: string
          coach_rpe?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          log_date: string
          notes?: string | null
          rpe_score?: number | null
          updated_at?: string | null
        }
        Update: {
          activity_type?: string | null
          athlete_id?: string
          club_id?: string
          coach_rpe?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          rpe_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rpe_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpe_logs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_batches: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          athlete_id: string
          bedtime: string | null
          club_id: string
          created_at: string | null
          duration_hours: number | null
          id: string
          notes: string | null
          quality_rating: number | null
          sleep_date: string
          updated_at: string | null
          wake_time: string | null
        }
        Insert: {
          athlete_id: string
          bedtime?: string | null
          club_id: string
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          notes?: string | null
          quality_rating?: number | null
          sleep_date: string
          updated_at?: string | null
          wake_time?: string | null
        }
        Update: {
          athlete_id?: string
          bedtime?: string | null
          club_id?: string
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          notes?: string | null
          quality_rating?: number | null
          sleep_date?: string
          updated_at?: string | null
          wake_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sleep_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_logs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participation: {
        Row: {
          athlete_id: string
          created_at: string | null
          id: string
          is_participating: boolean
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          id?: string
          is_participating: boolean
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          id?: string
          is_participating?: boolean
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tournament_results: {
        Row: {
          areas_of_improvement: string | null
          athlete_completed_at: string | null
          athlete_id: string
          coach_comments: string | null
          coach_completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          points_scored: number | null
          position: string | null
          rank: number | null
          result: string | null
          strong_points: string | null
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          areas_of_improvement?: string | null
          athlete_completed_at?: string | null
          athlete_id: string
          coach_comments?: string | null
          coach_completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          points_scored?: number | null
          position?: string | null
          rank?: number | null
          result?: string | null
          strong_points?: string | null
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          areas_of_improvement?: string | null
          athlete_completed_at?: string | null
          athlete_id?: string
          coach_comments?: string | null
          coach_completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          points_scored?: number | null
          position?: string | null
          rank?: number | null
          result?: string | null
          strong_points?: string | null
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          club_id: string | null
          created_at: string | null
          created_by_athlete_id: string | null
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          name: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string | null
          created_by_athlete_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          club_id?: string | null
          created_at?: string | null
          created_by_athlete_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_created_by_athlete_id_fkey"
            columns: ["created_by_athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_auth_rate_limit: {
        Args: {
          user_identifier: string
          action_type: string
          max_attempts?: number
          time_window?: unknown
        }
        Returns: boolean
      }
      cleanup_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      emergency_lockdown: {
        Args: { lockdown_reason: string }
        Returns: undefined
      }
      generate_club_code: {
        Args: { club_uuid: string }
        Returns: string
      }
      get_club_by_code: {
        Args: { code: string }
        Returns: string
      }
      get_current_user_club_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_security_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric: string
          count: number
          time_period: string
        }[]
      }
      log_security_event: {
        Args: {
          p_action: string
          p_table_name?: string
          p_record_id?: string
          p_old_values?: Json
          p_new_values?: Json
        }
        Returns: undefined
      }
      sanitize_text: {
        Args: { input: string }
        Returns: string
      }
      update_user_role: {
        Args: { target_user_id: string; new_role: string }
        Returns: undefined
      }
      validate_content_text: {
        Args: { input: string; max_length: number }
        Returns: boolean
      }
      validate_email: {
        Args: { email: string }
        Returns: boolean
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
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

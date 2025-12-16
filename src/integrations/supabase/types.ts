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
      activity_log: {
        Row: {
          created_at: string
          field: string | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          field?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          field?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          created_at: string
          id: string
          is_hq: boolean
          name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_hq?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_hq?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          id: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          id?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      task_files: {
        Row: {
          id: string
          name: string
          size: number
          task_id: string
          type: string
          uploaded_at: string
          uploaded_by_id: string | null
          url: string
        }
        Insert: {
          id?: string
          name: string
          size?: number
          task_id: string
          type?: string
          uploaded_at?: string
          uploaded_by_id?: string | null
          url: string
        }
        Update: {
          id?: string
          name?: string
          size?: number
          task_id?: string
          type?: string
          uploaded_at?: string
          uploaded_by_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_files_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      task_groups: {
        Row: {
          board_id: string
          color: string
          created_at: string
          id: string
          is_collapsed: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          board_id: string
          color?: string
          created_at?: string
          id?: string
          is_collapsed?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          board_id?: string
          color?: string
          created_at?: string
          id?: string
          is_collapsed?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_groups_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      task_people: {
        Row: {
          id: string
          task_id: string
          team_member_id: string
        }
        Insert: {
          id?: string
          task_id: string
          team_member_id: string
        }
        Update: {
          id?: string
          task_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_people_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_people_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          adaptador_id: string | null
          aor_complete: boolean | null
          aor_needed: boolean | null
          branch: string | null
          cantidad_episodios: number | null
          client_name: string | null
          created_at: string
          date_assigned: string | null
          date_delivered: string | null
          director_id: string | null
          dont_use_end: string | null
          dont_use_start: string | null
          entrega_cliente: string | null
          entrega_final_dub_audio: string | null
          entrega_final_script: string | null
          entrega_miami_end: string | null
          entrega_miami_start: string | null
          entrega_mix_retakes: string | null
          entrega_sesiones: string | null
          fase: string | null
          final_runtime: string | null
          formato: string | null
          group_id: string
          hq: string | null
          id: string
          is_private: boolean
          last_updated: string | null
          lenguaje_original: string | null
          link_to_col_hq: string | null
          locked_runtime: string | null
          mixer_bogota_id: string | null
          mixer_miami_id: string | null
          name: string
          phase_due_date: string | null
          project_manager_id: string | null
          prueba_de_voz: boolean | null
          qc_1_id: string | null
          qc_mix_id: string | null
          qc_retakes_id: string | null
          rate_info: string | null
          rates: number | null
          servicios: string | null
          show_guide: string | null
          sort_order: number
          status: string
          studio: string | null
          tecnico_id: string | null
          titulo_aprobado_espanol: string | null
          traductor_id: string | null
          work_order_number: string | null
        }
        Insert: {
          adaptador_id?: string | null
          aor_complete?: boolean | null
          aor_needed?: boolean | null
          branch?: string | null
          cantidad_episodios?: number | null
          client_name?: string | null
          created_at?: string
          date_assigned?: string | null
          date_delivered?: string | null
          director_id?: string | null
          dont_use_end?: string | null
          dont_use_start?: string | null
          entrega_cliente?: string | null
          entrega_final_dub_audio?: string | null
          entrega_final_script?: string | null
          entrega_miami_end?: string | null
          entrega_miami_start?: string | null
          entrega_mix_retakes?: string | null
          entrega_sesiones?: string | null
          fase?: string | null
          final_runtime?: string | null
          formato?: string | null
          group_id: string
          hq?: string | null
          id?: string
          is_private?: boolean
          last_updated?: string | null
          lenguaje_original?: string | null
          link_to_col_hq?: string | null
          locked_runtime?: string | null
          mixer_bogota_id?: string | null
          mixer_miami_id?: string | null
          name?: string
          phase_due_date?: string | null
          project_manager_id?: string | null
          prueba_de_voz?: boolean | null
          qc_1_id?: string | null
          qc_mix_id?: string | null
          qc_retakes_id?: string | null
          rate_info?: string | null
          rates?: number | null
          servicios?: string | null
          show_guide?: string | null
          sort_order?: number
          status?: string
          studio?: string | null
          tecnico_id?: string | null
          titulo_aprobado_espanol?: string | null
          traductor_id?: string | null
          work_order_number?: string | null
        }
        Update: {
          adaptador_id?: string | null
          aor_complete?: boolean | null
          aor_needed?: boolean | null
          branch?: string | null
          cantidad_episodios?: number | null
          client_name?: string | null
          created_at?: string
          date_assigned?: string | null
          date_delivered?: string | null
          director_id?: string | null
          dont_use_end?: string | null
          dont_use_start?: string | null
          entrega_cliente?: string | null
          entrega_final_dub_audio?: string | null
          entrega_final_script?: string | null
          entrega_miami_end?: string | null
          entrega_miami_start?: string | null
          entrega_mix_retakes?: string | null
          entrega_sesiones?: string | null
          fase?: string | null
          final_runtime?: string | null
          formato?: string | null
          group_id?: string
          hq?: string | null
          id?: string
          is_private?: boolean
          last_updated?: string | null
          lenguaje_original?: string | null
          link_to_col_hq?: string | null
          locked_runtime?: string | null
          mixer_bogota_id?: string | null
          mixer_miami_id?: string | null
          name?: string
          phase_due_date?: string | null
          project_manager_id?: string | null
          prueba_de_voz?: boolean | null
          qc_1_id?: string | null
          qc_mix_id?: string | null
          qc_retakes_id?: string | null
          rate_info?: string | null
          rates?: number | null
          servicios?: string | null
          show_guide?: string | null
          sort_order?: number
          status?: string
          studio?: string | null
          tecnico_id?: string | null
          titulo_aprobado_espanol?: string | null
          traductor_id?: string | null
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "task_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          color: string
          created_at: string
          email: string | null
          id: string
          initials: string
          name: string
          role: string
        }
        Insert: {
          color?: string
          created_at?: string
          email?: string | null
          id?: string
          initials: string
          name: string
          role?: string
        }
        Update: {
          color?: string
          created_at?: string
          email?: string | null
          id?: string
          initials?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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

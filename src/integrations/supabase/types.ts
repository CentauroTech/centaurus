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
          context_board: string | null
          context_phase: string | null
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
          context_board?: string | null
          context_phase?: string | null
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
          context_board?: string | null
          context_phase?: string | null
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
      column_visibility: {
        Row: {
          column_id: string
          column_label: string
          created_at: string | null
          id: string
          updated_at: string | null
          visible_to_team_members: boolean
        }
        Insert: {
          column_id: string
          column_label: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          visible_to_team_members?: boolean
        }
        Update: {
          column_id?: string
          column_label?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          visible_to_team_members?: boolean
        }
        Relationships: []
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
          is_guest_visible: boolean
          phase: string | null
          task_id: string
          updated_at: string
          user_id: string
          viewer_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_guest_visible?: boolean
          phase?: string | null
          task_id: string
          updated_at?: string
          user_id: string
          viewer_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_guest_visible?: boolean
          phase?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
          viewer_id?: string | null
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
          {
            foreignKeyName: "comments_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          team_member_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          team_member_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_completed_tasks: {
        Row: {
          cantidad_episodios: number | null
          completed_at: string
          created_at: string
          delivery_comment: string | null
          delivery_file_name: string | null
          delivery_file_url: string | null
          id: string
          locked_runtime: string | null
          phase: string
          role_performed: string
          task_id: string
          task_name: string
          team_member_id: string
          titulo_aprobado_espanol: string | null
          work_order_number: string | null
          workspace_name: string | null
        }
        Insert: {
          cantidad_episodios?: number | null
          completed_at?: string
          created_at?: string
          delivery_comment?: string | null
          delivery_file_name?: string | null
          delivery_file_url?: string | null
          id?: string
          locked_runtime?: string | null
          phase: string
          role_performed: string
          task_id: string
          task_name: string
          team_member_id: string
          titulo_aprobado_espanol?: string | null
          work_order_number?: string | null
          workspace_name?: string | null
        }
        Update: {
          cantidad_episodios?: number | null
          completed_at?: string
          created_at?: string
          delivery_comment?: string | null
          delivery_file_name?: string | null
          delivery_file_url?: string | null
          id?: string
          locked_runtime?: string | null
          phase?: string
          role_performed?: string
          task_id?: string
          task_name?: string
          team_member_id?: string
          titulo_aprobado_espanol?: string | null
          work_order_number?: string | null
          workspace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_completed_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_completed_tasks_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          completed_task_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          phase: string | null
          quantity: number
          role_performed: string | null
          runtime: string | null
          total_price: number
          unit_price: number
          work_order_number: string | null
        }
        Insert: {
          completed_task_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          phase?: string | null
          quantity?: number
          role_performed?: string | null
          runtime?: string | null
          total_price?: number
          unit_price?: number
          work_order_number?: string | null
        }
        Update: {
          completed_task_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          phase?: string | null
          quantity?: number
          role_performed?: string | null
          runtime?: string | null
          total_price?: number
          unit_price?: number
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_completed_task_id_fkey"
            columns: ["completed_task_id"]
            isOneToOne: false
            referencedRelation: "guest_completed_tasks"
            referencedColumns: ["id"]
          },
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
          approved_at: string | null
          approved_by_id: string | null
          billing_address: string | null
          billing_bank_account: string | null
          billing_bank_name: string | null
          billing_bank_routing: string | null
          billing_city: string | null
          billing_country: string | null
          billing_name: string
          billing_notes: string | null
          billing_tax_id: string | null
          created_at: string
          currency: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          payment_instructions: string | null
          rejection_reason: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          team_member_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          billing_address?: string | null
          billing_bank_account?: string | null
          billing_bank_name?: string | null
          billing_bank_routing?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_name: string
          billing_notes?: string | null
          billing_tax_id?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          payment_instructions?: string | null
          rejection_reason?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          team_member_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          billing_address?: string | null
          billing_bank_account?: string | null
          billing_bank_name?: string | null
          billing_bank_routing?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_name?: string
          billing_notes?: string | null
          billing_tax_id?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          payment_instructions?: string | null
          rejection_reason?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          team_member_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          bell_assignments: boolean
          bell_mentions: boolean
          created_at: string
          email_assignments: boolean
          email_mentions: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bell_assignments?: boolean
          bell_mentions?: boolean
          created_at?: string
          email_assignments?: boolean
          email_mentions?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bell_assignments?: boolean
          bell_mentions?: boolean
          created_at?: string
          email_assignments?: boolean
          email_mentions?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          board_name: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          task_id: string | null
          title: string
          triggered_by_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          board_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          task_id?: string | null
          title: string
          triggered_by_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          board_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          task_id?: string | null
          title?: string
          triggered_by_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_triggered_by_id_fkey"
            columns: ["triggered_by_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_automations: {
        Row: {
          created_at: string | null
          id: string
          phase: string
          team_member_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          phase: string
          team_member_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          phase?: string
          team_member_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_automations_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_files: {
        Row: {
          file_category: string
          id: string
          is_guest_accessible: boolean
          name: string
          phase: string | null
          size: number
          task_id: string
          type: string
          uploaded_at: string
          uploaded_by_id: string | null
          url: string
        }
        Insert: {
          file_category?: string
          id?: string
          is_guest_accessible?: boolean
          name: string
          phase?: string | null
          size?: number
          task_id: string
          type?: string
          uploaded_at?: string
          uploaded_by_id?: string | null
          url: string
        }
        Update: {
          file_category?: string
          id?: string
          is_guest_accessible?: boolean
          name?: string
          phase?: string | null
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
      task_viewers: {
        Row: {
          created_at: string
          id: string
          task_id: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_viewers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_viewers_team_member_id_fkey"
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
          branch: string
          cantidad_episodios: number | null
          client_name: string | null
          completed_at: string | null
          created_at: string
          date_assigned: string | null
          date_delivered: string | null
          delivery_comment: string | null
          director_id: string | null
          dont_use_end: string | null
          dont_use_start: string | null
          entrega_cliente: string | null
          entrega_final_dub_audio: string | null
          entrega_final_dub_audio_items: string[] | null
          entrega_final_script: string | null
          entrega_final_script_items: string[] | null
          entrega_miami_end: string | null
          entrega_miami_start: string | null
          entrega_mix_retakes: string | null
          entrega_sesiones: string | null
          fase: string | null
          final_runtime: string | null
          formato: string[] | null
          genre: string | null
          group_id: string
          guest_due_date: string | null
          hq: string | null
          id: string
          is_private: boolean
          kickoff_brief: string | null
          last_updated: string | null
          lenguaje_original: string | null
          link_to_col_hq: string | null
          locked_runtime: string | null
          mixer_bogota_id: string | null
          mixer_miami_id: string | null
          name: string
          phase_due_date: string | null
          project_manager_id: string
          prueba_de_voz: string | null
          qc_1_id: string | null
          qc_mix_id: string | null
          qc_retakes_id: string | null
          rate_info: string | null
          rates: number | null
          servicios: string[] | null
          show_guide: string | null
          sort_order: number
          started_at: string | null
          status: string
          studio: string | null
          studio_assigned: string | null
          target_language: string | null
          tecnico_id: string | null
          titulo_aprobado_espanol: string | null
          traductor_id: string | null
          work_order_number: string | null
        }
        Insert: {
          adaptador_id?: string | null
          aor_complete?: boolean | null
          aor_needed?: boolean | null
          branch: string
          cantidad_episodios?: number | null
          client_name?: string | null
          completed_at?: string | null
          created_at?: string
          date_assigned?: string | null
          date_delivered?: string | null
          delivery_comment?: string | null
          director_id?: string | null
          dont_use_end?: string | null
          dont_use_start?: string | null
          entrega_cliente?: string | null
          entrega_final_dub_audio?: string | null
          entrega_final_dub_audio_items?: string[] | null
          entrega_final_script?: string | null
          entrega_final_script_items?: string[] | null
          entrega_miami_end?: string | null
          entrega_miami_start?: string | null
          entrega_mix_retakes?: string | null
          entrega_sesiones?: string | null
          fase?: string | null
          final_runtime?: string | null
          formato?: string[] | null
          genre?: string | null
          group_id: string
          guest_due_date?: string | null
          hq?: string | null
          id?: string
          is_private?: boolean
          kickoff_brief?: string | null
          last_updated?: string | null
          lenguaje_original?: string | null
          link_to_col_hq?: string | null
          locked_runtime?: string | null
          mixer_bogota_id?: string | null
          mixer_miami_id?: string | null
          name?: string
          phase_due_date?: string | null
          project_manager_id: string
          prueba_de_voz?: string | null
          qc_1_id?: string | null
          qc_mix_id?: string | null
          qc_retakes_id?: string | null
          rate_info?: string | null
          rates?: number | null
          servicios?: string[] | null
          show_guide?: string | null
          sort_order?: number
          started_at?: string | null
          status?: string
          studio?: string | null
          studio_assigned?: string | null
          target_language?: string | null
          tecnico_id?: string | null
          titulo_aprobado_espanol?: string | null
          traductor_id?: string | null
          work_order_number?: string | null
        }
        Update: {
          adaptador_id?: string | null
          aor_complete?: boolean | null
          aor_needed?: boolean | null
          branch?: string
          cantidad_episodios?: number | null
          client_name?: string | null
          completed_at?: string | null
          created_at?: string
          date_assigned?: string | null
          date_delivered?: string | null
          delivery_comment?: string | null
          director_id?: string | null
          dont_use_end?: string | null
          dont_use_start?: string | null
          entrega_cliente?: string | null
          entrega_final_dub_audio?: string | null
          entrega_final_dub_audio_items?: string[] | null
          entrega_final_script?: string | null
          entrega_final_script_items?: string[] | null
          entrega_miami_end?: string | null
          entrega_miami_start?: string | null
          entrega_mix_retakes?: string | null
          entrega_sesiones?: string | null
          fase?: string | null
          final_runtime?: string | null
          formato?: string[] | null
          genre?: string | null
          group_id?: string
          guest_due_date?: string | null
          hq?: string | null
          id?: string
          is_private?: boolean
          kickoff_brief?: string | null
          last_updated?: string | null
          lenguaje_original?: string | null
          link_to_col_hq?: string | null
          locked_runtime?: string | null
          mixer_bogota_id?: string | null
          mixer_miami_id?: string | null
          name?: string
          phase_due_date?: string | null
          project_manager_id?: string
          prueba_de_voz?: string | null
          qc_1_id?: string | null
          qc_mix_id?: string | null
          qc_retakes_id?: string | null
          rate_info?: string | null
          rates?: number | null
          servicios?: string[] | null
          show_guide?: string | null
          sort_order?: number
          started_at?: string | null
          status?: string
          studio?: string | null
          studio_assigned?: string | null
          target_language?: string | null
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
      team_member_branches: {
        Row: {
          branch: string
          created_at: string | null
          id: string
          team_member_id: string
        }
        Insert: {
          branch: string
          created_at?: string | null
          id?: string
          team_member_id: string
        }
        Update: {
          branch?: string
          created_at?: string | null
          id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_branches_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_roles: {
        Row: {
          created_at: string | null
          id: string
          role_type: string
          team_member_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_type: string
          team_member_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_type?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_roles_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
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
          is_system_workspace: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system_workspace?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system_workspace?: boolean
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
      can_view_task: { Args: { task_id_param: string }; Returns: boolean }
      create_notification: {
        Args: {
          p_message?: string
          p_task_id: string
          p_title: string
          p_triggered_by_id: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      current_team_member_id: { Args: never; Returns: string }
      get_hq_board_data: { Args: { board_id_param: string }; Returns: Json }
      is_centauro_member: { Args: never; Returns: boolean }
      is_conversation_participant: {
        Args: { conv_id: string }
        Returns: boolean
      }
      is_guest: { Args: never; Returns: boolean }
      is_project_manager: { Args: never; Returns: boolean }
      is_team_member: { Args: never; Returns: boolean }
      move_task_to_next_phase: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: Json
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

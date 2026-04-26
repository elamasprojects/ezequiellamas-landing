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
      advisor_assignments: {
        Row: {
          active: boolean
          admin_id: string
          advisor_id: string
          created_at: string
          id: string
        }
        Insert: {
          active?: boolean
          admin_id: string
          advisor_id: string
          created_at?: string
          id?: string
        }
        Update: {
          active?: boolean
          admin_id?: string
          advisor_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      advisor_feedback: {
        Row: {
          admin_id: string
          advisor_id: string
          body: string
          created_at: string
          format_id: string | null
          id: string
          parent_id: string | null
          read: boolean
          scope: string
          script_id: string | null
          updated_at: string
          video_id: string | null
        }
        Insert: {
          admin_id: string
          advisor_id: string
          body: string
          created_at?: string
          format_id?: string | null
          id?: string
          parent_id?: string | null
          read?: boolean
          scope?: string
          script_id?: string | null
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          admin_id?: string
          advisor_id?: string
          body?: string
          created_at?: string
          format_id?: string | null
          id?: string
          parent_id?: string | null
          read?: boolean
          scope?: string
          script_id?: string | null
          updated_at?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_feedback_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_feedback_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "advisor_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_feedback_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_feedback_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_uploads: {
        Row: {
          created_at: string
          duration_seconds: number | null
          expires_at: string
          id: string
          mime_type: string | null
          owner_id: string
          size_bytes: number | null
          storage_path: string
          transcript: string | null
          transcript_error: string | null
          transcript_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          mime_type?: string | null
          owner_id: string
          size_bytes?: number | null
          storage_path: string
          transcript?: string | null
          transcript_error?: string | null
          transcript_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          mime_type?: string | null
          owner_id?: string
          size_bytes?: number | null
          storage_path?: string
          transcript?: string | null
          transcript_error?: string | null
          transcript_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      broll_suggestions: {
        Row: {
          created_at: string
          cue_text: string | null
          id: string
          position: number
          script_id: string
          suggestion: string
        }
        Insert: {
          created_at?: string
          cue_text?: string | null
          id?: string
          position?: number
          script_id: string
          suggestion: string
        }
        Update: {
          created_at?: string
          cue_text?: string | null
          id?: string
          position?: number
          script_id?: string
          suggestion?: string
        }
        Relationships: [
          {
            foreignKeyName: "broll_suggestions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      corrections: {
        Row: {
          created_at: string
          id: string
          notes: string
          requested_by: string
          resolved_at: string | null
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes: string
          requested_by: string
          resolved_at?: string | null
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string
          requested_by?: string
          resolved_at?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrections_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "video_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_assignments: {
        Row: {
          brolls_drive_url: string | null
          created_at: string
          due_date: string | null
          editor_id: string | null
          id: string
          instructions: string | null
          owner_id: string
          paid_at: string | null
          payment_amount: number | null
          payment_currency: string
          payment_status: string
          raw_drive_url: string | null
          script_id: string | null
          status: string
          title: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          brolls_drive_url?: string | null
          created_at?: string
          due_date?: string | null
          editor_id?: string | null
          id?: string
          instructions?: string | null
          owner_id: string
          paid_at?: string | null
          payment_amount?: number | null
          payment_currency?: string
          payment_status?: string
          raw_drive_url?: string | null
          script_id?: string | null
          status?: string
          title: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          brolls_drive_url?: string | null
          created_at?: string
          due_date?: string | null
          editor_id?: string | null
          id?: string
          instructions?: string | null
          owner_id?: string
          paid_at?: string | null
          payment_amount?: number | null
          payment_currency?: string
          payment_status?: string
          raw_drive_url?: string | null
          script_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editor_assignments_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_assignments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      formats: {
        Row: {
          created_at: string
          description: string | null
          example_storage_path: string | null
          example_url: string | null
          id: string
          name: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          example_storage_path?: string | null
          example_url?: string | null
          id?: string
          name: string
          owner_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          example_storage_path?: string | null
          example_url?: string | null
          id?: string
          name?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          cover_image_url: string | null
          created_at: string
          html_body: string
          id: string
          owner_id: string
          published: boolean
          published_at: string | null
          slug: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          html_body: string
          id?: string
          owner_id: string
          published?: boolean
          published_at?: string | null
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          html_body?: string
          id?: string
          owner_id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          ai_summary: string | null
          audio_upload_id: string | null
          created_at: string
          cta: string | null
          development: string | null
          estimated_wpm: number | null
          format_id: string | null
          generated_script: string | null
          hook: string | null
          id: string
          owner_id: string
          raw_concept: string | null
          scheduled_at: string | null
          status: string
          title: string | null
          tone: string | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          ai_summary?: string | null
          audio_upload_id?: string | null
          created_at?: string
          cta?: string | null
          development?: string | null
          estimated_wpm?: number | null
          format_id?: string | null
          generated_script?: string | null
          hook?: string | null
          id?: string
          owner_id: string
          raw_concept?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          tone?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          ai_summary?: string | null
          audio_upload_id?: string | null
          created_at?: string
          cta?: string | null
          development?: string | null
          estimated_wpm?: number | null
          format_id?: string | null
          generated_script?: string | null
          hook?: string | null
          id?: string
          owner_id?: string
          raw_concept?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          tone?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_audio_upload_id_fkey"
            columns: ["audio_upload_id"]
            isOneToOne: false
            referencedRelation: "audio_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_metrics_history: {
        Row: {
          captured_at: string
          comments: number | null
          id: string
          likes: number | null
          raw: Json | null
          saves: number | null
          shares: number | null
          video_id: string
          views_organic: number | null
          views_paid: number | null
          views_total: number | null
        }
        Insert: {
          captured_at?: string
          comments?: number | null
          id?: string
          likes?: number | null
          raw?: Json | null
          saves?: number | null
          shares?: number | null
          video_id: string
          views_organic?: number | null
          views_paid?: number | null
          views_total?: number | null
        }
        Update: {
          captured_at?: string
          comments?: number | null
          id?: string
          likes?: number | null
          raw?: Json | null
          saves?: number | null
          shares?: number | null
          video_id?: string
          views_organic?: number | null
          views_paid?: number | null
          views_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_metrics_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_submissions: {
        Row: {
          assignment_id: string
          created_at: string
          drive_url: string
          editor_id: string
          id: string
          notes: string | null
          status: string
          version: number
        }
        Insert: {
          assignment_id: string
          created_at?: string
          drive_url: string
          editor_id: string
          id?: string
          notes?: string | null
          status?: string
          version?: number
        }
        Update: {
          assignment_id?: string
          created_at?: string
          drive_url?: string
          editor_id?: string
          id?: string
          notes?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "editor_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          apify_short_code: string | null
          caption: string | null
          comments: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          drop_off_seconds: number | null
          format_id: string | null
          id: string
          last_scrape_error: string | null
          last_scraped_at: string | null
          likes: number | null
          metrics_updated_at: string | null
          multiplier: number | null
          notes: string | null
          owner_id: string
          performance_tier: string | null
          posted_at: string | null
          reach: number | null
          retention_pct: number | null
          saves: number | null
          script_id: string | null
          shares: number | null
          source_platform: string | null
          source_url: string | null
          spend: number | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          views_organic: number | null
          views_paid: number | null
          views_total: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          apify_short_code?: string | null
          caption?: string | null
          comments?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          drop_off_seconds?: number | null
          format_id?: string | null
          id?: string
          last_scrape_error?: string | null
          last_scraped_at?: string | null
          likes?: number | null
          metrics_updated_at?: string | null
          multiplier?: number | null
          notes?: string | null
          owner_id: string
          performance_tier?: string | null
          posted_at?: string | null
          reach?: number | null
          retention_pct?: number | null
          saves?: number | null
          script_id?: string | null
          shares?: number | null
          source_platform?: string | null
          source_url?: string | null
          spend?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          views_organic?: number | null
          views_paid?: number | null
          views_total?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          apify_short_code?: string | null
          caption?: string | null
          comments?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          drop_off_seconds?: number | null
          format_id?: string | null
          id?: string
          last_scrape_error?: string | null
          last_scraped_at?: string | null
          likes?: number | null
          metrics_updated_at?: string | null
          multiplier?: number | null
          notes?: string | null
          owner_id?: string
          performance_tier?: string | null
          posted_at?: string | null
          reach?: number | null
          retention_pct?: number | null
          saves?: number | null
          script_id?: string | null
          shares?: number | null
          source_platform?: string | null
          source_url?: string | null
          spend?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          views_organic?: number | null
          views_paid?: number | null
          views_total?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_script_with_brolls: {
        Args: {
          _ai_summary: string
          _audio_upload_id: string
          _brolls: Json
          _cta: string
          _development: string
          _estimated_wpm: number
          _format_id: string
          _generated_script: string
          _hook: string
          _raw_concept: string
          _title: string
          _tone: string
          _word_count: number
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "advisor"
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
      app_role: ["admin", "editor", "advisor"],
    },
  },
} as const

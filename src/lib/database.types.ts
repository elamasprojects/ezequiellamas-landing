export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audio_uploads: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          expires_at: string;
          id: string;
          mime_type: string | null;
          owner_id: string;
          size_bytes: number | null;
          storage_path: string;
          transcript: string | null;
          transcript_error: string | null;
          transcript_status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          expires_at?: string;
          id?: string;
          mime_type?: string | null;
          owner_id: string;
          size_bytes?: number | null;
          storage_path: string;
          transcript?: string | null;
          transcript_error?: string | null;
          transcript_status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          expires_at?: string;
          id?: string;
          mime_type?: string | null;
          owner_id?: string;
          size_bytes?: number | null;
          storage_path?: string;
          transcript?: string | null;
          transcript_error?: string | null;
          transcript_status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      broll_suggestions: {
        Row: {
          created_at: string;
          cue_text: string | null;
          id: string;
          position: number;
          script_id: string;
          suggestion: string;
        };
        Insert: {
          created_at?: string;
          cue_text?: string | null;
          id?: string;
          position?: number;
          script_id: string;
          suggestion: string;
        };
        Update: {
          created_at?: string;
          cue_text?: string | null;
          id?: string;
          position?: number;
          script_id?: string;
          suggestion?: string;
        };
        Relationships: [
          {
            foreignKeyName: "broll_suggestions_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      formats: {
        Row: {
          created_at: string;
          description: string | null;
          example_storage_path: string | null;
          example_url: string | null;
          id: string;
          name: string;
          owner_id: string;
          position: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          example_storage_path?: string | null;
          example_url?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          position?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          example_storage_path?: string | null;
          example_url?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scripts: {
        Row: {
          ai_summary: string | null;
          audio_upload_id: string | null;
          created_at: string;
          cta: string | null;
          development: string | null;
          estimated_wpm: number | null;
          format_id: string | null;
          generated_script: string | null;
          hook: string | null;
          id: string;
          owner_id: string;
          raw_concept: string | null;
          scheduled_at: string | null;
          status: string;
          title: string | null;
          tone: string | null;
          updated_at: string;
          word_count: number | null;
        };
        Insert: {
          ai_summary?: string | null;
          audio_upload_id?: string | null;
          created_at?: string;
          cta?: string | null;
          development?: string | null;
          estimated_wpm?: number | null;
          format_id?: string | null;
          generated_script?: string | null;
          hook?: string | null;
          id?: string;
          owner_id: string;
          raw_concept?: string | null;
          scheduled_at?: string | null;
          status?: string;
          title?: string | null;
          tone?: string | null;
          updated_at?: string;
          word_count?: number | null;
        };
        Update: {
          ai_summary?: string | null;
          audio_upload_id?: string | null;
          created_at?: string;
          cta?: string | null;
          development?: string | null;
          estimated_wpm?: number | null;
          format_id?: string | null;
          generated_script?: string | null;
          hook?: string | null;
          id?: string;
          owner_id?: string;
          raw_concept?: string | null;
          scheduled_at?: string | null;
          status?: string;
          title?: string | null;
          tone?: string | null;
          updated_at?: string;
          word_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "scripts_audio_upload_id_fkey";
            columns: ["audio_upload_id"];
            isOneToOne: false;
            referencedRelation: "audio_uploads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scripts_format_id_fkey";
            columns: ["format_id"];
            isOneToOne: false;
            referencedRelation: "formats";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      video_metrics_history: {
        Row: {
          captured_at: string;
          comments: number | null;
          id: string;
          likes: number | null;
          raw: Json | null;
          saves: number | null;
          shares: number | null;
          video_id: string;
          views_organic: number | null;
          views_paid: number | null;
          views_total: number | null;
        };
        Insert: {
          captured_at?: string;
          comments?: number | null;
          id?: string;
          likes?: number | null;
          raw?: Json | null;
          saves?: number | null;
          shares?: number | null;
          video_id: string;
          views_organic?: number | null;
          views_paid?: number | null;
          views_total?: number | null;
        };
        Update: {
          captured_at?: string;
          comments?: number | null;
          id?: string;
          likes?: number | null;
          raw?: Json | null;
          saves?: number | null;
          shares?: number | null;
          video_id?: string;
          views_organic?: number | null;
          views_paid?: number | null;
          views_total?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "video_metrics_history_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      videos: {
        Row: {
          caption: string | null;
          comments: number | null;
          cpc: number | null;
          cpm: number | null;
          created_at: string;
          drop_off_seconds: number | null;
          format_id: string | null;
          id: string;
          likes: number | null;
          metrics_updated_at: string | null;
          multiplier: number | null;
          notes: string | null;
          owner_id: string;
          performance_tier: string | null;
          posted_at: string | null;
          reach: number | null;
          retention_pct: number | null;
          saves: number | null;
          script_id: string | null;
          shares: number | null;
          source_platform: string | null;
          source_url: string | null;
          spend: number | null;
          thumbnail_url: string | null;
          title: string | null;
          updated_at: string;
          views_organic: number | null;
          views_paid: number | null;
          views_total: number | null;
          watch_time_seconds: number | null;
        };
        Insert: {
          caption?: string | null;
          comments?: number | null;
          cpc?: number | null;
          cpm?: number | null;
          created_at?: string;
          drop_off_seconds?: number | null;
          format_id?: string | null;
          id?: string;
          likes?: number | null;
          metrics_updated_at?: string | null;
          multiplier?: number | null;
          notes?: string | null;
          owner_id: string;
          performance_tier?: string | null;
          posted_at?: string | null;
          reach?: number | null;
          retention_pct?: number | null;
          saves?: number | null;
          script_id?: string | null;
          shares?: number | null;
          source_platform?: string | null;
          source_url?: string | null;
          spend?: number | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          views_organic?: number | null;
          views_paid?: number | null;
          views_total?: number | null;
          watch_time_seconds?: number | null;
        };
        Update: {
          caption?: string | null;
          comments?: number | null;
          cpc?: number | null;
          cpm?: number | null;
          created_at?: string;
          drop_off_seconds?: number | null;
          format_id?: string | null;
          id?: string;
          likes?: number | null;
          metrics_updated_at?: string | null;
          multiplier?: number | null;
          notes?: string | null;
          owner_id?: string;
          performance_tier?: string | null;
          posted_at?: string | null;
          reach?: number | null;
          retention_pct?: number | null;
          saves?: number | null;
          script_id?: string | null;
          shares?: number | null;
          source_platform?: string | null;
          source_url?: string | null;
          spend?: number | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          views_organic?: number | null;
          views_paid?: number | null;
          views_total?: number | null;
          watch_time_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "videos_format_id_fkey";
            columns: ["format_id"];
            isOneToOne: false;
            referencedRelation: "formats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "videos_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_script_with_brolls: {
        Args: {
          _ai_summary: string;
          _audio_upload_id: string;
          _brolls: Json;
          _cta: string;
          _development: string;
          _estimated_wpm: number;
          _format_id: string;
          _generated_script: string;
          _hook: string;
          _raw_concept: string;
          _title: string;
          _tone: string;
          _word_count: number;
        };
        Returns: string;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "editor" | "advisor";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends {
  Row: infer R;
}
  ? R
  : never;

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never;

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "advisor"],
    },
  },
} as const;

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
      carousel_render_jobs: {
        Row: {
          carousel_id: string
          completed_slides: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          mode: string
          owner_id: string
          started_at: string | null
          status: string
          total_slides: number
          updated_at: string
          worker_request_id: string | null
        }
        Insert: {
          carousel_id: string
          completed_slides?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          mode: string
          owner_id: string
          started_at?: string | null
          status?: string
          total_slides: number
          updated_at?: string
          worker_request_id?: string | null
        }
        Update: {
          carousel_id?: string
          completed_slides?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          owner_id?: string
          started_at?: string | null
          status?: string
          total_slides?: number
          updated_at?: string
          worker_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carousel_render_jobs_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "carousels"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_slides: {
        Row: {
          carousel_id: string
          content: Json
          created_at: string
          id: string
          index: number
          owner_id: string
          render_error: string | null
          render_status: string
          rendered_at: string | null
          rendered_format: string | null
          rendered_path: string | null
          template: string
          updated_at: string
        }
        Insert: {
          carousel_id: string
          content: Json
          created_at?: string
          id?: string
          index: number
          owner_id: string
          render_error?: string | null
          render_status?: string
          rendered_at?: string | null
          rendered_format?: string | null
          rendered_path?: string | null
          template: string
          updated_at?: string
        }
        Update: {
          carousel_id?: string
          content?: Json
          created_at?: string
          id?: string
          index?: number
          owner_id?: string
          render_error?: string | null
          render_status?: string
          rendered_at?: string | null
          rendered_format?: string | null
          rendered_path?: string | null
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carousel_slides_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "carousels"
            referencedColumns: ["id"]
          },
        ]
      }
      carousels: {
        Row: {
          concept: string
          created_at: string
          cta_keyword: string | null
          generation_error: string | null
          hook_angle: string | null
          id: string
          mode: string
          owner_id: string
          slide_count: number | null
          status: string
          thumbnail_path: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          concept: string
          created_at?: string
          cta_keyword?: string | null
          generation_error?: string | null
          hook_angle?: string | null
          id?: string
          mode?: string
          owner_id: string
          slide_count?: number | null
          status?: string
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          concept?: string
          created_at?: string
          cta_keyword?: string | null
          generation_error?: string | null
          hook_angle?: string | null
          id?: string
          mode?: string
          owner_id?: string
          slide_count?: number | null
          status?: string
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
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
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          redirect_uri: string
          state: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          redirect_uri: string
          state: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          owner_id?: string
          platform?: Database["public"]["Enums"]["video_platform"]
          redirect_uri?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          instagram_handle: string | null
          tiktok_handle: string | null
          updated_at: string
          youtube_handle: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          instagram_handle?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          youtube_handle?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          youtube_handle?: string | null
        }
        Relationships: []
      }
      publish_jobs: {
        Row: {
          attempt: number
          awaiting_user_action_at: string | null
          created_at: string
          finished_at: string | null
          id: string
          last_error: string | null
          last_error_at: string | null
          max_attempts: number
          payload: Json
          platform: Database["public"]["Enums"]["video_platform"]
          provider_post_id: string | null
          provider_post_url: string | null
          scheduled_post_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["publish_job_status"]
          updated_at: string
          user_completed_at: string | null
          video_id: string | null
          video_post_id: string | null
        }
        Insert: {
          attempt?: number
          awaiting_user_action_at?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          max_attempts?: number
          payload?: Json
          platform: Database["public"]["Enums"]["video_platform"]
          provider_post_id?: string | null
          provider_post_url?: string | null
          scheduled_post_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["publish_job_status"]
          updated_at?: string
          user_completed_at?: string | null
          video_id?: string | null
          video_post_id?: string | null
        }
        Update: {
          attempt?: number
          awaiting_user_action_at?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          max_attempts?: number
          payload?: Json
          platform?: Database["public"]["Enums"]["video_platform"]
          provider_post_id?: string | null
          provider_post_url?: string | null
          scheduled_post_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["publish_job_status"]
          updated_at?: string
          user_completed_at?: string | null
          video_id?: string | null
          video_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publish_jobs_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_jobs_video_post_id_fkey"
            columns: ["video_post_id"]
            isOneToOne: false
            referencedRelation: "video_posts"
            referencedColumns: ["id"]
          },
        ]
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
      scheduled_posts: {
        Row: {
          asset_kind: Database["public"]["Enums"]["scheduled_post_asset_kind"]
          bunny_library_id: string | null
          bunny_video_id: string | null
          cancelled_at: string | null
          caption_default: string | null
          captions: Json
          carousel_id: string | null
          created_at: string
          format_id: string | null
          hashtags: string[]
          id: string
          notes: string | null
          owner_id: string
          scheduled_at: string
          script_id: string | null
          status: Database["public"]["Enums"]["scheduled_post_status"]
          thumbnail_url: string | null
          timezone: string
          title: string | null
          updated_at: string
          video_storage_path: string | null
        }
        Insert: {
          asset_kind: Database["public"]["Enums"]["scheduled_post_asset_kind"]
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          cancelled_at?: string | null
          caption_default?: string | null
          captions?: Json
          carousel_id?: string | null
          created_at?: string
          format_id?: string | null
          hashtags?: string[]
          id?: string
          notes?: string | null
          owner_id: string
          scheduled_at: string
          script_id?: string | null
          status?: Database["public"]["Enums"]["scheduled_post_status"]
          thumbnail_url?: string | null
          timezone?: string
          title?: string | null
          updated_at?: string
          video_storage_path?: string | null
        }
        Update: {
          asset_kind?: Database["public"]["Enums"]["scheduled_post_asset_kind"]
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          cancelled_at?: string | null
          caption_default?: string | null
          captions?: Json
          carousel_id?: string | null
          created_at?: string
          format_id?: string | null
          hashtags?: string[]
          id?: string
          notes?: string | null
          owner_id?: string
          scheduled_at?: string
          script_id?: string | null
          status?: Database["public"]["Enums"]["scheduled_post_status"]
          thumbnail_url?: string | null
          timezone?: string
          title?: string | null
          updated_at?: string
          video_storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "carousels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
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
      social_accounts: {
        Row: {
          access_token: string
          avatar_url: string | null
          connected_at: string
          display_name: string | null
          external_account_id: string
          id: string
          last_used_at: string | null
          meta: Json
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          refresh_token: string | null
          scopes: string[]
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          avatar_url?: string | null
          connected_at?: string
          display_name?: string | null
          external_account_id: string
          id?: string
          last_used_at?: string | null
          meta?: Json
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          avatar_url?: string | null
          connected_at?: string
          display_name?: string | null
          external_account_id?: string
          id?: string
          last_used_at?: string | null
          meta?: Json
          owner_id?: string
          platform?: Database["public"]["Enums"]["video_platform"]
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_owner_id_fkey"
            columns: ["owner_id"]
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
          video_post_id: string
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
          video_post_id: string
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
          video_post_id?: string
          views_organic?: number | null
          views_paid?: number | null
          views_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_metrics_history_video_post_id_fkey"
            columns: ["video_post_id"]
            isOneToOne: false
            referencedRelation: "video_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      video_posts: {
        Row: {
          apify_short_code: string | null
          caption: string | null
          comments: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          dimensions_height: number | null
          dimensions_width: number | null
          drop_off_seconds: number | null
          hashtags: string[] | null
          id: string
          last_scrape_error: string | null
          last_scraped_at: string | null
          likes: number | null
          mentions: string[] | null
          metrics_updated_at: string | null
          music_author: string | null
          music_name: string | null
          owner_full_name: string | null
          owner_username: string | null
          platform: Database["public"]["Enums"]["video_platform"]
          posted_at: string | null
          raw: Json | null
          reach: number | null
          retention_pct: number | null
          saves: number | null
          shares: number | null
          source_url: string
          spend: number | null
          thumbnail_cdn_url: string | null
          thumbnail_storage_path: string | null
          thumbnail_url: string | null
          updated_at: string
          video_duration: number | null
          video_id: string
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
          dimensions_height?: number | null
          dimensions_width?: number | null
          drop_off_seconds?: number | null
          hashtags?: string[] | null
          id?: string
          last_scrape_error?: string | null
          last_scraped_at?: string | null
          likes?: number | null
          mentions?: string[] | null
          metrics_updated_at?: string | null
          music_author?: string | null
          music_name?: string | null
          owner_full_name?: string | null
          owner_username?: string | null
          platform: Database["public"]["Enums"]["video_platform"]
          posted_at?: string | null
          raw?: Json | null
          reach?: number | null
          retention_pct?: number | null
          saves?: number | null
          shares?: number | null
          source_url: string
          spend?: number | null
          thumbnail_cdn_url?: string | null
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_duration?: number | null
          video_id: string
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
          dimensions_height?: number | null
          dimensions_width?: number | null
          drop_off_seconds?: number | null
          hashtags?: string[] | null
          id?: string
          last_scrape_error?: string | null
          last_scraped_at?: string | null
          likes?: number | null
          mentions?: string[] | null
          metrics_updated_at?: string | null
          music_author?: string | null
          music_name?: string | null
          owner_full_name?: string | null
          owner_username?: string | null
          platform?: Database["public"]["Enums"]["video_platform"]
          posted_at?: string | null
          raw?: Json | null
          reach?: number | null
          retention_pct?: number | null
          saves?: number | null
          shares?: number | null
          source_url?: string
          spend?: number | null
          thumbnail_cdn_url?: string | null
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_duration?: number | null
          video_id?: string
          views_organic?: number | null
          views_paid?: number | null
          views_total?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_posts_video_id_fkey"
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
          created_at: string
          format_id: string | null
          id: string
          multiplier: number | null
          notes: string | null
          owner_id: string
          performance_tier: string | null
          script_id: string | null
          title: string | null
          transcript: string | null
          transcript_error: string | null
          transcript_language: string | null
          transcript_status: string | null
          updated_at: string
          views_total_aggregate: number | null
        }
        Insert: {
          created_at?: string
          format_id?: string | null
          id?: string
          multiplier?: number | null
          notes?: string | null
          owner_id: string
          performance_tier?: string | null
          script_id?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string | null
          updated_at?: string
          views_total_aggregate?: number | null
        }
        Update: {
          created_at?: string
          format_id?: string | null
          id?: string
          multiplier?: number | null
          notes?: string | null
          owner_id?: string
          performance_tier?: string | null
          script_id?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string | null
          updated_at?: string
          views_total_aggregate?: number | null
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
      web_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          failed_count: number
          id: string
          last_error: string | null
          last_seen_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          failed_count?: number
          id?: string
          last_error?: string | null
          last_seen_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          failed_count?: number
          id?: string
          last_error?: string | null
          last_seen_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_push_subscriptions_user_id_fkey"
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
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
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
      publish_job_status:
        | "pending"
        | "in_progress"
        | "awaiting_user"
        | "succeeded"
        | "failed"
        | "cancelled"
      scheduled_post_asset_kind: "video" | "carousel"
      scheduled_post_status:
        | "draft"
        | "scheduled"
        | "publishing"
        | "published"
        | "partial"
        | "failed"
        | "cancelled"
      video_platform: "instagram" | "youtube" | "tiktok" | "other"
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
      publish_job_status: [
        "pending",
        "in_progress",
        "awaiting_user",
        "succeeded",
        "failed",
        "cancelled",
      ],
      scheduled_post_asset_kind: ["video", "carousel"],
      scheduled_post_status: [
        "draft",
        "scheduled",
        "publishing",
        "published",
        "partial",
        "failed",
        "cancelled",
      ],
      video_platform: ["instagram", "youtube", "tiktok", "other"],
    },
  },
} as const

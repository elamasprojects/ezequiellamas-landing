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
      broll_styles: {
        Row: {
          animation_prompt: string | null
          created_at: string
          id: string
          image_prompt: string | null
          name: string
          owner_id: string
          position: number
          template_code: string | null
          template_name: string | null
          thumbnail_url: string | null
          updated_at: string
          variant: string
        }
        Insert: {
          animation_prompt?: string | null
          created_at?: string
          id?: string
          image_prompt?: string | null
          name: string
          owner_id: string
          position?: number
          template_code?: string | null
          template_name?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          variant: string
        }
        Update: {
          animation_prompt?: string | null
          created_at?: string
          id?: string
          image_prompt?: string | null
          name?: string
          owner_id?: string
          position?: number
          template_code?: string | null
          template_name?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      broll_suggestions: {
        Row: {
          animation_description: string | null
          created_at: string
          cue_text: string | null
          generation_error: string | null
          generation_status: string
          id: string
          image_description: string | null
          intermediate_image_url: string | null
          is_manual: boolean
          output_type: string | null
          output_url: string | null
          position: number
          requested: boolean
          script_id: string
          selected_words: string[] | null
          style_id: string | null
          suggestion: string
          updated_at: string
          variant: string | null
        }
        Insert: {
          animation_description?: string | null
          created_at?: string
          cue_text?: string | null
          generation_error?: string | null
          generation_status?: string
          id?: string
          image_description?: string | null
          intermediate_image_url?: string | null
          is_manual?: boolean
          output_type?: string | null
          output_url?: string | null
          position?: number
          requested?: boolean
          script_id: string
          selected_words?: string[] | null
          style_id?: string | null
          suggestion: string
          updated_at?: string
          variant?: string | null
        }
        Update: {
          animation_description?: string | null
          created_at?: string
          cue_text?: string | null
          generation_error?: string | null
          generation_status?: string
          id?: string
          image_description?: string | null
          intermediate_image_url?: string | null
          is_manual?: boolean
          output_type?: string | null
          output_url?: string | null
          position?: number
          requested?: boolean
          script_id?: string
          selected_words?: string[] | null
          style_id?: string | null
          suggestion?: string
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broll_suggestions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broll_suggestions_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "broll_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      bunny_videos: {
        Row: {
          archived_at: string | null
          available_resolutions: string | null
          bunny_library_id: string
          bunny_video_id: string
          created_at: string
          duration_seconds: number | null
          encode_error: string | null
          encode_progress: number | null
          filename: string | null
          height: number | null
          id: string
          last_polled_at: string | null
          owner_id: string
          size_bytes: number | null
          status: string
          thumbnail_url: string | null
          title: string | null
          transcript: string | null
          transcript_error: string | null
          transcript_language: string | null
          transcript_status: string
          updated_at: string
          width: number | null
        }
        Insert: {
          archived_at?: string | null
          available_resolutions?: string | null
          bunny_library_id: string
          bunny_video_id: string
          created_at?: string
          duration_seconds?: number | null
          encode_error?: string | null
          encode_progress?: number | null
          filename?: string | null
          height?: number | null
          id?: string
          last_polled_at?: string | null
          owner_id: string
          size_bytes?: number | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          archived_at?: string | null
          available_resolutions?: string | null
          bunny_library_id?: string
          bunny_video_id?: string
          created_at?: string
          duration_seconds?: number | null
          encode_error?: string | null
          encode_progress?: number | null
          filename?: string | null
          height?: number | null
          id?: string
          last_polled_at?: string | null
          owner_id?: string
          size_bytes?: number | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      carousel_references: {
        Row: {
          analysis_error: string | null
          analysis_status: string
          apify_short_code: string | null
          caption: string | null
          concept: string | null
          created_at: string
          id: string
          last_analyzed_at: string | null
          last_scraped_at: string | null
          normalized_url: string
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          posted_at: string | null
          raw: Json | null
          scrape_error: string | null
          scrape_status: string
          slide_count: number | null
          slides: Json | null
          source_url: string
          updated_at: string
        }
        Insert: {
          analysis_error?: string | null
          analysis_status?: string
          apify_short_code?: string | null
          caption?: string | null
          concept?: string | null
          created_at?: string
          id?: string
          last_analyzed_at?: string | null
          last_scraped_at?: string | null
          normalized_url: string
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          posted_at?: string | null
          raw?: Json | null
          scrape_error?: string | null
          scrape_status?: string
          slide_count?: number | null
          slides?: Json | null
          source_url: string
          updated_at?: string
        }
        Update: {
          analysis_error?: string | null
          analysis_status?: string
          apify_short_code?: string | null
          caption?: string | null
          concept?: string | null
          created_at?: string
          id?: string
          last_analyzed_at?: string | null
          last_scraped_at?: string | null
          normalized_url?: string
          owner_id?: string
          platform?: Database["public"]["Enums"]["video_platform"]
          posted_at?: string | null
          raw?: Json | null
          scrape_error?: string | null
          scrape_status?: string
          slide_count?: number | null
          slides?: Json | null
          source_url?: string
          updated_at?: string
        }
        Relationships: []
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
          carousel_reference_id: string | null
          concept: string
          created_at: string
          cta_keyword: string | null
          design_format: string
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
          carousel_reference_id?: string | null
          concept: string
          created_at?: string
          cta_keyword?: string | null
          design_format: string
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
          carousel_reference_id?: string | null
          concept?: string
          created_at?: string
          cta_keyword?: string | null
          design_format?: string
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
        Relationships: [
          {
            foreignKeyName: "carousels_carousel_reference_id_fkey"
            columns: ["carousel_reference_id"]
            isOneToOne: false
            referencedRelation: "carousel_references"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_analysis_settings: {
        Row: {
          absolute_min_views: number
          created_at: string
          enabled: boolean
          id: string
          maturity_days: number
          min_history_clips: number
          owner_id: string
          relative_multiplier: number
          updated_at: string
        }
        Insert: {
          absolute_min_views?: number
          created_at?: string
          enabled?: boolean
          id?: string
          maturity_days?: number
          min_history_clips?: number
          owner_id: string
          relative_multiplier?: number
          updated_at?: string
        }
        Update: {
          absolute_min_views?: number
          created_at?: string
          enabled?: boolean
          id?: string
          maturity_days?: number
          min_history_clips?: number
          owner_id?: string
          relative_multiplier?: number
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
      cover_assets: {
        Row: {
          asset_type: string
          created_at: string
          id: string
          name: string
          owner_id: string
          storage_path: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          asset_type?: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          storage_path?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          storage_path?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      cover_styles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          position: number
          reference_image_path: string | null
          reference_image_url: string | null
          system_prompt: string
          updated_at: string
          when_to_use: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          position?: number
          reference_image_path?: string | null
          reference_image_url?: string | null
          system_prompt?: string
          updated_at?: string
          when_to_use?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          position?: number
          reference_image_path?: string | null
          reference_image_url?: string | null
          system_prompt?: string
          updated_at?: string
          when_to_use?: string | null
        }
        Relationships: []
      }
      covers: {
        Row: {
          aspect_ratio: string
          cover_style_id: string | null
          created_at: string
          generated_image_path: string | null
          generated_image_url: string | null
          generation_error: string | null
          id: string
          idea_fuerza: string | null
          owner_id: string
          prompt_used: string | null
          script_id: string | null
          series_id: string | null
          status: string
          suggested_style_id: string | null
          title: string | null
          updated_at: string
          video_id: string | null
          youtube_project_id: string | null
        }
        Insert: {
          aspect_ratio?: string
          cover_style_id?: string | null
          created_at?: string
          generated_image_path?: string | null
          generated_image_url?: string | null
          generation_error?: string | null
          id?: string
          idea_fuerza?: string | null
          owner_id: string
          prompt_used?: string | null
          script_id?: string | null
          series_id?: string | null
          status?: string
          suggested_style_id?: string | null
          title?: string | null
          updated_at?: string
          video_id?: string | null
          youtube_project_id?: string | null
        }
        Update: {
          aspect_ratio?: string
          cover_style_id?: string | null
          created_at?: string
          generated_image_path?: string | null
          generated_image_url?: string | null
          generation_error?: string | null
          id?: string
          idea_fuerza?: string | null
          owner_id?: string
          prompt_used?: string | null
          script_id?: string | null
          series_id?: string | null
          status?: string
          suggested_style_id?: string | null
          title?: string | null
          updated_at?: string
          video_id?: string | null
          youtube_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "covers_cover_style_id_fkey"
            columns: ["cover_style_id"]
            isOneToOne: false
            referencedRelation: "cover_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covers_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covers_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covers_suggested_style_id_fkey"
            columns: ["suggested_style_id"]
            isOneToOne: false
            referencedRelation: "cover_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covers_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covers_youtube_project_id_fkey"
            columns: ["youtube_project_id"]
            isOneToOne: false
            referencedRelation: "youtube_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profile: {
        Row: {
          aspirational_referents: Json
          created_at: string
          desired_impact: string | null
          follower_goals: Json
          id: string
          long_form_strategy: string | null
          my_story: string | null
          owner_id: string
          product_service: string | null
          short_form_strategy: string | null
          skills_knowledge: string | null
          target_audience: string | null
          updated_at: string
          what_i_transmit: string | null
          who_am_i: string | null
          why_i_create: string | null
        }
        Insert: {
          aspirational_referents?: Json
          created_at?: string
          desired_impact?: string | null
          follower_goals?: Json
          id?: string
          long_form_strategy?: string | null
          my_story?: string | null
          owner_id: string
          product_service?: string | null
          short_form_strategy?: string | null
          skills_knowledge?: string | null
          target_audience?: string | null
          updated_at?: string
          what_i_transmit?: string | null
          who_am_i?: string | null
          why_i_create?: string | null
        }
        Update: {
          aspirational_referents?: Json
          created_at?: string
          desired_impact?: string | null
          follower_goals?: Json
          id?: string
          long_form_strategy?: string | null
          my_story?: string | null
          owner_id?: string
          product_service?: string | null
          short_form_strategy?: string | null
          skills_knowledge?: string | null
          target_audience?: string | null
          updated_at?: string
          what_i_transmit?: string | null
          who_am_i?: string | null
          why_i_create?: string | null
        }
        Relationships: []
      }
      editor_assignments: {
        Row: {
          brolls_drive_url: string | null
          created_at: string
          due_date: string | null
          editing_style: Database["public"]["Enums"]["editing_style"] | null
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
          editing_style?: Database["public"]["Enums"]["editing_style"] | null
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
          editing_style?: Database["public"]["Enums"]["editing_style"] | null
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
      engagement_replies: {
        Row: {
          ai_draft: string | null
          attempts: number
          author_handle: string | null
          author_name: string | null
          conversation_id: string | null
          created_at: string
          dedupe_key: string | null
          edited_text: string | null
          error: string | null
          id: string
          kind: string
          owner_id: string
          parent_comment_id: string | null
          platform: string
          platform_post_url: string | null
          post_id: string | null
          received_at: string | null
          sent_at: string | null
          social_account_id: string | null
          source_text: string | null
          status: string
          updated_at: string
          zernio_account_id: string | null
          zernio_response: Json | null
        }
        Insert: {
          ai_draft?: string | null
          attempts?: number
          author_handle?: string | null
          author_name?: string | null
          conversation_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          edited_text?: string | null
          error?: string | null
          id?: string
          kind: string
          owner_id: string
          parent_comment_id?: string | null
          platform: string
          platform_post_url?: string | null
          post_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          social_account_id?: string | null
          source_text?: string | null
          status?: string
          updated_at?: string
          zernio_account_id?: string | null
          zernio_response?: Json | null
        }
        Update: {
          ai_draft?: string | null
          attempts?: number
          author_handle?: string | null
          author_name?: string | null
          conversation_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          edited_text?: string | null
          error?: string | null
          id?: string
          kind?: string
          owner_id?: string
          parent_comment_id?: string | null
          platform?: string
          platform_post_url?: string | null
          post_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          social_account_id?: string | null
          source_text?: string | null
          status?: string
          updated_at?: string
          zernio_account_id?: string | null
          zernio_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_replies_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_settings: {
        Row: {
          comments_enabled: boolean
          created_at: string
          dms_enabled: boolean
          enabled: boolean
          owner_id: string
          tone_instructions: string | null
          updated_at: string
        }
        Insert: {
          comments_enabled?: boolean
          created_at?: string
          dms_enabled?: boolean
          enabled?: boolean
          owner_id: string
          tone_instructions?: string | null
          updated_at?: string
        }
        Update: {
          comments_enabled?: boolean
          created_at?: string
          dms_enabled?: boolean
          enabled?: boolean
          owner_id?: string
          tone_instructions?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      formats: {
        Row: {
          content_lengths: string[]
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
          content_lengths?: string[]
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
          content_lengths?: string[]
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
      idea_references: {
        Row: {
          apify_short_code: string | null
          caption: string | null
          created_at: string
          id: string
          last_scraped_at: string | null
          normalized_url: string
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          posted_at: string | null
          raw: Json | null
          source_url: string
          thumbnail_url: string | null
          title: string | null
          transcript: string | null
          transcript_error: string | null
          transcript_language: string | null
          transcript_status: string
          updated_at: string
          video_duration: number | null
        }
        Insert: {
          apify_short_code?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          normalized_url: string
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          posted_at?: string | null
          raw?: Json | null
          source_url: string
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          video_duration?: number | null
        }
        Update: {
          apify_short_code?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          normalized_url?: string
          owner_id?: string
          platform?: Database["public"]["Enums"]["video_platform"]
          posted_at?: string | null
          raw?: Json | null
          source_url?: string
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          video_duration?: number | null
        }
        Relationships: []
      }
      motion_graphic_categories: {
        Row: {
          avoid_when: string[]
          created_at: string
          essence: string | null
          id: string
          is_system: boolean
          label: string
          num: string
          owner_id: string | null
          position: number
          slug: string
          updated_at: string
          use_when: string[]
        }
        Insert: {
          avoid_when?: string[]
          created_at?: string
          essence?: string | null
          id?: string
          is_system?: boolean
          label: string
          num: string
          owner_id?: string | null
          position?: number
          slug: string
          updated_at?: string
          use_when?: string[]
        }
        Update: {
          avoid_when?: string[]
          created_at?: string
          essence?: string | null
          id?: string
          is_system?: boolean
          label?: string
          num?: string
          owner_id?: string | null
          position?: number
          slug?: string
          updated_at?: string
          use_when?: string[]
        }
        Relationships: []
      }
      motion_graphic_suggestions: {
        Row: {
          created_at: string
          cue_text: string | null
          end_ms: number | null
          end_word_index: number | null
          filled_slots: Json
          generation_error: string | null
          generation_status: string
          id: string
          is_manual: boolean
          output_format: string
          output_url: string | null
          position: number
          rationale: string | null
          requested: boolean
          script_id: string
          start_ms: number | null
          start_word_index: number | null
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cue_text?: string | null
          end_ms?: number | null
          end_word_index?: number | null
          filled_slots?: Json
          generation_error?: string | null
          generation_status?: string
          id?: string
          is_manual?: boolean
          output_format?: string
          output_url?: string | null
          position?: number
          rationale?: string | null
          requested?: boolean
          script_id: string
          start_ms?: number | null
          start_word_index?: number | null
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cue_text?: string | null
          end_ms?: number | null
          end_word_index?: number | null
          filled_slots?: Json
          generation_error?: string | null
          generation_status?: string
          id?: string
          is_manual?: boolean
          output_format?: string
          output_url?: string | null
          position?: number
          rationale?: string | null
          requested?: boolean
          script_id?: string
          start_ms?: number | null
          start_word_index?: number | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "motion_graphic_suggestions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motion_graphic_suggestions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "motion_graphic_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      motion_graphic_templates: {
        Row: {
          avoid_for: string[]
          category_id: string
          claim_type: string[]
          content_slots: Json
          created_at: string
          duration_s: number
          id: string
          is_system: boolean
          name: string
          narrative_position: string[]
          owner_id: string | null
          pillars: string[]
          position: number
          slug: string
          tag: string | null
          tone: string[]
          updated_at: string
          use_for: string[]
          visual: string | null
        }
        Insert: {
          avoid_for?: string[]
          category_id: string
          claim_type?: string[]
          content_slots: Json
          created_at?: string
          duration_s: number
          id?: string
          is_system?: boolean
          name: string
          narrative_position?: string[]
          owner_id?: string | null
          pillars?: string[]
          position?: number
          slug: string
          tag?: string | null
          tone?: string[]
          updated_at?: string
          use_for?: string[]
          visual?: string | null
        }
        Update: {
          avoid_for?: string[]
          category_id?: string
          claim_type?: string[]
          content_slots?: Json
          created_at?: string
          duration_s?: number
          id?: string
          is_system?: boolean
          name?: string
          narrative_position?: string[]
          owner_id?: string | null
          pillars?: string[]
          position?: number
          slug?: string
          tag?: string | null
          tone?: string[]
          updated_at?: string
          use_for?: string[]
          visual?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motion_graphic_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "motion_graphic_categories"
            referencedColumns: ["id"]
          },
        ]
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
      post_predictions: {
        Row: {
          abs_pct_error: number | null
          actual_captured_at: string | null
          actual_tier: Database["public"]["Enums"]["virality_tier"] | null
          actual_views: number | null
          baseline_snapshot: Json
          calibration_snapshot: Json
          confidence: number
          created_at: string
          error: string | null
          evaluated_at: string | null
          horizon_label: string | null
          id: string
          input_snapshot: Json
          key_drivers: Json
          model_version: string
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          predicted_tier: Database["public"]["Enums"]["virality_tier"]
          predicted_views_high: number
          predicted_views_low: number
          predicted_views_point: number
          predicted_virality_score: number
          reasoning: string | null
          referent_signals: Json
          referent_snapshot: Json
          risks: Json
          scheduled_post_id: string
          score_error: number | null
          signed_pct_error: number | null
          status: string
          updated_at: string
          video_post_id: string | null
          within_range: boolean | null
        }
        Insert: {
          abs_pct_error?: number | null
          actual_captured_at?: string | null
          actual_tier?: Database["public"]["Enums"]["virality_tier"] | null
          actual_views?: number | null
          baseline_snapshot?: Json
          calibration_snapshot?: Json
          confidence: number
          created_at?: string
          error?: string | null
          evaluated_at?: string | null
          horizon_label?: string | null
          id?: string
          input_snapshot?: Json
          key_drivers?: Json
          model_version: string
          owner_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          predicted_tier: Database["public"]["Enums"]["virality_tier"]
          predicted_views_high: number
          predicted_views_low: number
          predicted_views_point: number
          predicted_virality_score: number
          reasoning?: string | null
          referent_signals?: Json
          referent_snapshot?: Json
          risks?: Json
          scheduled_post_id: string
          score_error?: number | null
          signed_pct_error?: number | null
          status?: string
          updated_at?: string
          video_post_id?: string | null
          within_range?: boolean | null
        }
        Update: {
          abs_pct_error?: number | null
          actual_captured_at?: string | null
          actual_tier?: Database["public"]["Enums"]["virality_tier"] | null
          actual_views?: number | null
          baseline_snapshot?: Json
          calibration_snapshot?: Json
          confidence?: number
          created_at?: string
          error?: string | null
          evaluated_at?: string | null
          horizon_label?: string | null
          id?: string
          input_snapshot?: Json
          key_drivers?: Json
          model_version?: string
          owner_id?: string
          platform?: Database["public"]["Enums"]["video_platform"]
          predicted_tier?: Database["public"]["Enums"]["virality_tier"]
          predicted_views_high?: number
          predicted_views_low?: number
          predicted_views_point?: number
          predicted_virality_score?: number
          reasoning?: string | null
          referent_signals?: Json
          referent_snapshot?: Json
          risks?: Json
          scheduled_post_id?: string
          score_error?: number | null
          signed_pct_error?: number | null
          status?: string
          updated_at?: string
          video_post_id?: string | null
          within_range?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "post_predictions_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_predictions_video_post_id_fkey"
            columns: ["video_post_id"]
            isOneToOne: false
            referencedRelation: "video_posts"
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
      prompt_overrides: {
        Row: {
          content: string
          created_at: string
          id: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          owner_id?: string
          slug?: string
          updated_at?: string
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
      publishing_slots: {
        Row: {
          active: boolean
          created_at: string
          hour: number
          id: string
          minute: number
          owner_id: string
          weekday: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          hour: number
          id?: string
          minute?: number
          owner_id: string
          weekday: number
        }
        Update: {
          active?: boolean
          created_at?: string
          hour?: number
          id?: string
          minute?: number
          owner_id?: string
          weekday?: number
        }
        Relationships: []
      }
      content_ideas: {
        Row: {
          angle: string | null
          comments_summary: Json | null
          concept: string | null
          content_length: string
          created_at: string
          dedup_key: string | null
          derived_from: string[]
          generated_script_id: string | null
          generated_youtube_project_id: string | null
          hook: string | null
          id: string
          idea_reference_id: string | null
          model_version: string | null
          news_refs: Json | null
          owner_id: string
          pillar: string | null
          rationale: string | null
          referent_video_id: string | null
          source: string
          source_metrics: Json
          source_video_id: string | null
          status: string
          suggested_format_id: string | null
          updated_at: string
          winner_analysis: Json | null
        }
        Insert: {
          angle?: string | null
          comments_summary?: Json | null
          concept?: string | null
          content_length?: string
          created_at?: string
          dedup_key?: string | null
          derived_from?: string[]
          generated_script_id?: string | null
          generated_youtube_project_id?: string | null
          hook?: string | null
          id?: string
          idea_reference_id?: string | null
          model_version?: string | null
          news_refs?: Json | null
          owner_id: string
          pillar?: string | null
          rationale?: string | null
          referent_video_id?: string | null
          source: string
          source_metrics?: Json
          source_video_id?: string | null
          status?: string
          suggested_format_id?: string | null
          updated_at?: string
          winner_analysis?: Json | null
        }
        Update: {
          angle?: string | null
          comments_summary?: Json | null
          concept?: string | null
          content_length?: string
          created_at?: string
          dedup_key?: string | null
          derived_from?: string[]
          generated_script_id?: string | null
          generated_youtube_project_id?: string | null
          hook?: string | null
          id?: string
          idea_reference_id?: string | null
          model_version?: string | null
          news_refs?: Json | null
          owner_id?: string
          pillar?: string | null
          rationale?: string | null
          referent_video_id?: string | null
          source?: string
          source_metrics?: Json
          source_video_id?: string | null
          status?: string
          suggested_format_id?: string | null
          updated_at?: string
          winner_analysis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_ideas_suggested_format_id_fkey"
            columns: ["suggested_format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_referent_video_id_fkey"
            columns: ["referent_video_id"]
            isOneToOne: false
            referencedRelation: "referent_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_idea_reference_id_fkey"
            columns: ["idea_reference_id"]
            isOneToOne: false
            referencedRelation: "idea_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_source_video_id_fkey"
            columns: ["source_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_generated_script_id_fkey"
            columns: ["generated_script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_generated_youtube_project_id_fkey"
            columns: ["generated_youtube_project_id"]
            isOneToOne: false
            referencedRelation: "youtube_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_proposals: {
        Row: {
          baseline_median: number | null
          batch_id: string | null
          bunny_library_id: string | null
          bunny_video_id: string | null
          caption_snapshot: string | null
          clip_total_views: number | null
          created_at: string
          hashtags: string[]
          id: string
          instagram_scheduled_post_id: string | null
          justification: string | null
          metrics: Json
          owner_id: string
          scheduled_post_id: string
          score: number | null
          status: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          baseline_median?: number | null
          batch_id?: string | null
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          caption_snapshot?: string | null
          clip_total_views?: number | null
          created_at?: string
          hashtags?: string[]
          id?: string
          instagram_scheduled_post_id?: string | null
          justification?: string | null
          metrics?: Json
          owner_id: string
          scheduled_post_id: string
          score?: number | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          baseline_median?: number | null
          batch_id?: string | null
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          caption_snapshot?: string | null
          clip_total_views?: number | null
          created_at?: string
          hashtags?: string[]
          id?: string
          instagram_scheduled_post_id?: string | null
          justification?: string | null
          metrics?: Json
          owner_id?: string
          scheduled_post_id?: string
          score?: number | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_proposals_instagram_scheduled_post_id_fkey"
            columns: ["instagram_scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_proposals_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      referent_collections: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      referent_collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          referent_video_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          referent_video_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          referent_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referent_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "referent_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referent_collection_items_referent_video_id_fkey"
            columns: ["referent_video_id"]
            isOneToOne: false
            referencedRelation: "referent_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      referent_reports: {
        Row: {
          content_mode: string
          covered_from: string | null
          covered_through: string | null
          created_at: string
          error: string | null
          id: string
          markdown: string | null
          owner_id: string
          period_label: string | null
          referent_id: string
          status: string
          updated_at: string
          video_count: number
        }
        Insert: {
          content_mode?: string
          covered_from?: string | null
          covered_through?: string | null
          created_at?: string
          error?: string | null
          id?: string
          markdown?: string | null
          owner_id: string
          period_label?: string | null
          referent_id: string
          status?: string
          updated_at?: string
          video_count?: number
        }
        Update: {
          content_mode?: string
          covered_from?: string | null
          covered_through?: string | null
          created_at?: string
          error?: string | null
          id?: string
          markdown?: string | null
          owner_id?: string
          period_label?: string | null
          referent_id?: string
          status?: string
          updated_at?: string
          video_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "referent_reports_referent_id_fkey"
            columns: ["referent_id"]
            isOneToOne: false
            referencedRelation: "referents"
            referencedColumns: ["id"]
          },
        ]
      }
      referent_videos: {
        Row: {
          apify_short_code: string | null
          business_objective: string | null
          caption: string | null
          comments: number | null
          concept_error: string | null
          concept_status: string
          concept_summary: string | null
          content_objectives: string[] | null
          content_type: string | null
          created_at: string
          id: string
          last_scraped_at: string | null
          likes: number | null
          long_form_breakdown: Json | null
          main_topics: string[] | null
          metrics_updated_at: string | null
          platform: Database["public"]["Enums"]["video_platform"]
          posted_at: string | null
          raw: Json | null
          referent_id: string
          saves: number | null
          shares: number | null
          source_url: string
          thumbnail_url: string | null
          title: string | null
          transcript: string | null
          transcript_error: string | null
          transcript_language: string | null
          transcript_status: string
          updated_at: string
          video_duration: number | null
          views_total: number | null
        }
        Insert: {
          apify_short_code?: string | null
          business_objective?: string | null
          caption?: string | null
          comments?: number | null
          concept_error?: string | null
          concept_status?: string
          concept_summary?: string | null
          content_objectives?: string[] | null
          content_type?: string | null
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          likes?: number | null
          long_form_breakdown?: Json | null
          main_topics?: string[] | null
          metrics_updated_at?: string | null
          platform: Database["public"]["Enums"]["video_platform"]
          posted_at?: string | null
          raw?: Json | null
          referent_id: string
          saves?: number | null
          shares?: number | null
          source_url: string
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          video_duration?: number | null
          views_total?: number | null
        }
        Update: {
          apify_short_code?: string | null
          business_objective?: string | null
          caption?: string | null
          comments?: number | null
          concept_error?: string | null
          concept_status?: string
          concept_summary?: string | null
          content_objectives?: string[] | null
          content_type?: string | null
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          likes?: number | null
          long_form_breakdown?: Json | null
          main_topics?: string[] | null
          metrics_updated_at?: string | null
          platform?: Database["public"]["Enums"]["video_platform"]
          posted_at?: string | null
          raw?: Json | null
          referent_id?: string
          saves?: number | null
          shares?: number | null
          source_url?: string
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          video_duration?: number | null
          views_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referent_videos_referent_id_fkey"
            columns: ["referent_id"]
            isOneToOne: false
            referencedRelation: "referents"
            referencedColumns: ["id"]
          },
        ]
      }
      referents: {
        Row: {
          created_at: string
          id: string
          instagram_handle: string | null
          instagram_url: string | null
          last_scrape_error: string | null
          last_scraped_at: string | null
          name: string
          note: string | null
          owner_id: string
          position: number
          tiktok_handle: string | null
          tiktok_url: string | null
          updated_at: string
          youtube_handle: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_handle?: string | null
          instagram_url?: string | null
          last_scrape_error?: string | null
          last_scraped_at?: string | null
          name: string
          note?: string | null
          owner_id: string
          position?: number
          tiktok_handle?: string | null
          tiktok_url?: string | null
          updated_at?: string
          youtube_handle?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instagram_handle?: string | null
          instagram_url?: string | null
          last_scrape_error?: string | null
          last_scraped_at?: string | null
          name?: string
          note?: string | null
          owner_id?: string
          position?: number
          tiktok_handle?: string | null
          tiktok_url?: string | null
          updated_at?: string
          youtube_handle?: string | null
          youtube_url?: string | null
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
      scheduled_posts: {
        Row: {
          asset_kind: Database["public"]["Enums"]["scheduled_post_asset_kind"]
          batch_id: string | null
          bunny_library_id: string | null
          bunny_video_id: string | null
          cancelled_at: string | null
          caption_default: string | null
          captions: Json
          carousel_id: string | null
          clip_analysis_status: string
          clip_total_views: number | null
          comment_automation_button_title: string | null
          comment_automation_dm_message: string | null
          comment_automation_enabled: boolean
          comment_automation_error: string | null
          comment_automation_keywords: string[] | null
          comment_automation_link_url: string | null
          comment_automation_match_mode: string
          comment_automation_reply: string | null
          comment_automation_status: string
          cover_id: string | null
          created_at: string
          cta: string | null
          format_id: string | null
          hashtags: string[]
          id: string
          is_clip: boolean
          notes: string | null
          owner_id: string
          prep_attempts: number
          prep_error: string | null
          prep_status: string
          published_at: string | null
          scheduled_at: string
          script_id: string | null
          status: Database["public"]["Enums"]["scheduled_post_status"]
          thumbnail_url: string | null
          timezone: string
          title: string | null
          transcript: string | null
          transcript_error: string | null
          transcript_language: string | null
          transcript_status: string
          updated_at: string
          video_storage_path: string | null
          zernio_automation_id: string | null
        }
        Insert: {
          asset_kind: Database["public"]["Enums"]["scheduled_post_asset_kind"]
          batch_id?: string | null
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          cancelled_at?: string | null
          caption_default?: string | null
          captions?: Json
          carousel_id?: string | null
          clip_analysis_status?: string
          clip_total_views?: number | null
          comment_automation_button_title?: string | null
          comment_automation_dm_message?: string | null
          comment_automation_enabled?: boolean
          comment_automation_error?: string | null
          comment_automation_keywords?: string[] | null
          comment_automation_link_url?: string | null
          comment_automation_match_mode?: string
          comment_automation_reply?: string | null
          comment_automation_status?: string
          cover_id?: string | null
          created_at?: string
          cta?: string | null
          format_id?: string | null
          hashtags?: string[]
          id?: string
          is_clip?: boolean
          notes?: string | null
          owner_id: string
          prep_attempts?: number
          prep_error?: string | null
          prep_status?: string
          published_at?: string | null
          scheduled_at: string
          script_id?: string | null
          status?: Database["public"]["Enums"]["scheduled_post_status"]
          thumbnail_url?: string | null
          timezone?: string
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          video_storage_path?: string | null
          zernio_automation_id?: string | null
        }
        Update: {
          asset_kind?: Database["public"]["Enums"]["scheduled_post_asset_kind"]
          batch_id?: string | null
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          cancelled_at?: string | null
          caption_default?: string | null
          captions?: Json
          carousel_id?: string | null
          clip_analysis_status?: string
          clip_total_views?: number | null
          comment_automation_button_title?: string | null
          comment_automation_dm_message?: string | null
          comment_automation_enabled?: boolean
          comment_automation_error?: string | null
          comment_automation_keywords?: string[] | null
          comment_automation_link_url?: string | null
          comment_automation_match_mode?: string
          comment_automation_reply?: string | null
          comment_automation_status?: string
          cover_id?: string | null
          created_at?: string
          cta?: string | null
          format_id?: string | null
          hashtags?: string[]
          id?: string
          is_clip?: boolean
          notes?: string | null
          owner_id?: string
          prep_attempts?: number
          prep_error?: string | null
          prep_status?: string
          published_at?: string | null
          scheduled_at?: string
          script_id?: string | null
          status?: Database["public"]["Enums"]["scheduled_post_status"]
          thumbnail_url?: string | null
          timezone?: string
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          video_storage_path?: string | null
          zernio_automation_id?: string | null
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
            foreignKeyName: "scheduled_posts_cover_id_fkey"
            columns: ["cover_id"]
            isOneToOne: false
            referencedRelation: "covers"
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
      script_approvals: {
        Row: {
          admin_id: string
          advisor_id: string
          created_at: string
          decision: string
          id: string
          notes: string | null
          script_id: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          advisor_id: string
          created_at?: string
          decision: string
          id?: string
          notes?: string | null
          script_id: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          advisor_id?: string
          created_at?: string
          decision?: string
          id?: string
          notes?: string | null
          script_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_approvals_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_ingredients: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          position: number
          script_id: string
          source_id: string
          source_kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          position?: number
          script_id: string
          source_id: string
          source_kind: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          position?: number
          script_id?: string
          source_id?: string
          source_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_ingredients_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          adapt_mode: string | null
          ai_summary: string | null
          audio_upload_id: string | null
          avatar_target: string | null
          caption: string | null
          content_bucket: string | null
          content_length: string
          created_at: string
          cta: string | null
          development: string | null
          estimated_wpm: number | null
          format_id: string | null
          generated_script: string | null
          generation_warning: string | null
          hashtags: string[]
          hook: string | null
          hook_alternatives: string[]
          hook_reference: string | null
          id: string
          idea_reference_id: string | null
          mental_model: string | null
          on_screen_text: string | null
          owner_id: string
          part_number: number | null
          platform_codes: string[]
          raw_concept: string | null
          reference_mode: string | null
          referent_video_id: string | null
          scheduled_at: string | null
          seo_keywords: string[]
          series_id: string | null
          shape_id: string | null
          status: string
          storytelling_conflict: string | null
          storytelling_resolution: string | null
          storytelling_setup: string | null
          title: string | null
          tone: string | null
          updated_at: string
          visual_hook_format: number | null
          why_it_works: string | null
          word_count: number | null
        }
        Insert: {
          adapt_mode?: string | null
          ai_summary?: string | null
          audio_upload_id?: string | null
          avatar_target?: string | null
          caption?: string | null
          content_bucket?: string | null
          content_length?: string
          created_at?: string
          cta?: string | null
          development?: string | null
          estimated_wpm?: number | null
          format_id?: string | null
          generated_script?: string | null
          generation_warning?: string | null
          hashtags?: string[]
          hook?: string | null
          hook_alternatives?: string[]
          hook_reference?: string | null
          id?: string
          idea_reference_id?: string | null
          mental_model?: string | null
          on_screen_text?: string | null
          owner_id: string
          part_number?: number | null
          platform_codes?: string[]
          raw_concept?: string | null
          reference_mode?: string | null
          referent_video_id?: string | null
          scheduled_at?: string | null
          seo_keywords?: string[]
          series_id?: string | null
          shape_id?: string | null
          status?: string
          storytelling_conflict?: string | null
          storytelling_resolution?: string | null
          storytelling_setup?: string | null
          title?: string | null
          tone?: string | null
          updated_at?: string
          visual_hook_format?: number | null
          why_it_works?: string | null
          word_count?: number | null
        }
        Update: {
          adapt_mode?: string | null
          ai_summary?: string | null
          audio_upload_id?: string | null
          avatar_target?: string | null
          caption?: string | null
          content_bucket?: string | null
          content_length?: string
          created_at?: string
          cta?: string | null
          development?: string | null
          estimated_wpm?: number | null
          format_id?: string | null
          generated_script?: string | null
          generation_warning?: string | null
          hashtags?: string[]
          hook?: string | null
          hook_alternatives?: string[]
          hook_reference?: string | null
          id?: string
          idea_reference_id?: string | null
          mental_model?: string | null
          on_screen_text?: string | null
          owner_id?: string
          part_number?: number | null
          platform_codes?: string[]
          raw_concept?: string | null
          reference_mode?: string | null
          referent_video_id?: string | null
          scheduled_at?: string | null
          seo_keywords?: string[]
          series_id?: string | null
          shape_id?: string | null
          status?: string
          storytelling_conflict?: string | null
          storytelling_resolution?: string | null
          storytelling_setup?: string | null
          title?: string | null
          tone?: string | null
          updated_at?: string
          visual_hook_format?: number | null
          why_it_works?: string | null
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
          {
            foreignKeyName: "scripts_idea_reference_id_fkey"
            columns: ["idea_reference_id"]
            isOneToOne: false
            referencedRelation: "idea_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_referent_video_id_fkey"
            columns: ["referent_video_id"]
            isOneToOne: false
            referencedRelation: "referent_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_shape_id_fkey"
            columns: ["shape_id"]
            isOneToOne: false
            referencedRelation: "shapes"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          cover_reference_image_url: string | null
          cover_system_prompt: string | null
          created_at: string
          description: string | null
          example_url: string | null
          id: string
          name: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          cover_reference_image_url?: string | null
          cover_system_prompt?: string | null
          created_at?: string
          description?: string | null
          example_url?: string | null
          id?: string
          name: string
          owner_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          cover_reference_image_url?: string | null
          cover_system_prompt?: string | null
          created_at?: string
          description?: string | null
          example_url?: string | null
          id?: string
          name?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      shapes: {
        Row: {
          created_at: string
          description: string | null
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
          example_url?: string | null
          id?: string
          name?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
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
          platform_post_id: string | null
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
          platform_post_id?: string | null
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
          platform_post_id?: string | null
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
          is_clip: boolean
          multiplier: number | null
          notes: string | null
          owner_id: string
          part_number: number | null
          performance_tier: string | null
          script_id: string | null
          series_id: string | null
          shape_id: string | null
          title: string | null
          transcript: string | null
          transcript_error: string | null
          transcript_language: string | null
          transcript_status: string | null
          updated_at: string
          views_total_aggregate: number | null
          zernio_late_post_id: string | null
        }
        Insert: {
          created_at?: string
          format_id?: string | null
          id?: string
          is_clip?: boolean
          multiplier?: number | null
          notes?: string | null
          owner_id: string
          part_number?: number | null
          performance_tier?: string | null
          script_id?: string | null
          series_id?: string | null
          shape_id?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string | null
          updated_at?: string
          views_total_aggregate?: number | null
          zernio_late_post_id?: string | null
        }
        Update: {
          created_at?: string
          format_id?: string | null
          id?: string
          is_clip?: boolean
          multiplier?: number | null
          notes?: string | null
          owner_id?: string
          part_number?: number | null
          performance_tier?: string | null
          script_id?: string | null
          series_id?: string | null
          shape_id?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string | null
          updated_at?: string
          views_total_aggregate?: number | null
          zernio_late_post_id?: string | null
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
          {
            foreignKeyName: "videos_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_shape_id_fkey"
            columns: ["shape_id"]
            isOneToOne: false
            referencedRelation: "shapes"
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
      youtube_connections: {
        Row: {
          access_token: string | null
          channel_id: string | null
          channel_thumbnail_url: string | null
          channel_title: string | null
          created_at: string
          id: string
          last_sync_error: string | null
          last_synced_at: string | null
          owner_id: string
          refresh_token: string | null
          scopes: string[] | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          channel_id?: string | null
          channel_thumbnail_url?: string | null
          channel_title?: string | null
          created_at?: string
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          owner_id: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          channel_id?: string | null
          channel_thumbnail_url?: string | null
          channel_title?: string | null
          created_at?: string
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          owner_id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      youtube_project_sections: {
        Row: {
          audio_mode: string | null
          bunny_video_id: string | null
          clone_error: string | null
          clone_status: string
          clone_video_url: string | null
          created_at: string
          duration_seconds: number | null
          heygen_avatar_id: string | null
          heygen_video_id: string | null
          id: string
          kind: string
          owner_id: string
          points: string | null
          position: number
          project_id: string
          recorded_audio_path: string | null
          recorder: string
          title: string | null
          updated_at: string
        }
        Insert: {
          audio_mode?: string | null
          bunny_video_id?: string | null
          clone_error?: string | null
          clone_status?: string
          clone_video_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          heygen_avatar_id?: string | null
          heygen_video_id?: string | null
          id?: string
          kind?: string
          owner_id: string
          points?: string | null
          position?: number
          project_id: string
          recorded_audio_path?: string | null
          recorder?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          audio_mode?: string | null
          bunny_video_id?: string | null
          clone_error?: string | null
          clone_status?: string
          clone_video_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          heygen_avatar_id?: string | null
          heygen_video_id?: string | null
          id?: string
          kind?: string
          owner_id?: string
          points?: string | null
          position?: number
          project_id?: string
          recorded_audio_path?: string | null
          recorder?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_project_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "youtube_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_projects: {
        Row: {
          audio_upload_id: string | null
          chosen_thumbnail_cover_id: string | null
          chosen_title: string | null
          created_at: string
          default_audio_mode: string
          default_heygen_avatar_id: string | null
          id: string
          idea: string | null
          length_tier: string
          orientation: string
          owner_id: string
          status: string
          structure_error: string | null
          structure_status: string
          title: string | null
          title_options: string[] | null
          updated_at: string
        }
        Insert: {
          audio_upload_id?: string | null
          chosen_thumbnail_cover_id?: string | null
          chosen_title?: string | null
          created_at?: string
          default_audio_mode?: string
          default_heygen_avatar_id?: string | null
          id?: string
          idea?: string | null
          length_tier?: string
          orientation?: string
          owner_id: string
          status?: string
          structure_error?: string | null
          structure_status?: string
          title?: string | null
          title_options?: string[] | null
          updated_at?: string
        }
        Update: {
          audio_upload_id?: string | null
          chosen_thumbnail_cover_id?: string | null
          chosen_title?: string | null
          created_at?: string
          default_audio_mode?: string
          default_heygen_avatar_id?: string | null
          id?: string
          idea?: string | null
          length_tier?: string
          orientation?: string
          owner_id?: string
          status?: string
          structure_error?: string | null
          structure_status?: string
          title?: string | null
          title_options?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_projects_audio_upload_id_fkey"
            columns: ["audio_upload_id"]
            isOneToOne: false
            referencedRelation: "audio_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_videos: {
        Row: {
          business_objective: string | null
          comment_count: number | null
          concept_error: string | null
          concept_status: string
          concept_summary: string | null
          content_objectives: string[] | null
          content_type: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          last_synced_at: string | null
          like_count: number | null
          main_topics: string[] | null
          owner_id: string
          published_at: string | null
          raw: Json | null
          thumbnail_url: string | null
          title: string | null
          transcript: string | null
          transcript_error: string | null
          transcript_language: string | null
          transcript_status: string
          updated_at: string
          view_count: number | null
          youtube_video_id: string
        }
        Insert: {
          business_objective?: string | null
          comment_count?: number | null
          concept_error?: string | null
          concept_status?: string
          concept_summary?: string | null
          content_objectives?: string[] | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          last_synced_at?: string | null
          like_count?: number | null
          main_topics?: string[] | null
          owner_id: string
          published_at?: string | null
          raw?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          view_count?: number | null
          youtube_video_id: string
        }
        Update: {
          business_objective?: string | null
          comment_count?: number | null
          concept_error?: string | null
          concept_status?: string
          concept_summary?: string | null
          content_objectives?: string[] | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          last_synced_at?: string | null
          like_count?: number | null
          main_topics?: string[] | null
          owner_id?: string
          published_at?: string | null
          raw?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          transcript_error?: string | null
          transcript_language?: string | null
          transcript_status?: string
          updated_at?: string
          view_count?: number | null
          youtube_video_id?: string
        }
        Relationships: []
      }
      zernio_account_daily: {
        Row: {
          created_at: string
          date: string
          followers: number | null
          id: string
          owner_id: string
          platform: string
          social_account_id: string
        }
        Insert: {
          created_at?: string
          date: string
          followers?: number | null
          id?: string
          owner_id: string
          platform: string
          social_account_id: string
        }
        Update: {
          created_at?: string
          date?: string
          followers?: number | null
          id?: string
          owner_id?: string
          platform?: string
          social_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zernio_account_daily_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      zernio_account_stats: {
        Row: {
          avatar_url: string | null
          content_count: number | null
          display_name: string | null
          followers: number | null
          following: number | null
          growth: number | null
          growth_pct: number | null
          last_synced_at: string
          likes_total: number | null
          owner_id: string
          platform: string
          raw: Json | null
          social_account_id: string
          updated_at: string
          username: string | null
          views_total: number | null
        }
        Insert: {
          avatar_url?: string | null
          content_count?: number | null
          display_name?: string | null
          followers?: number | null
          following?: number | null
          growth?: number | null
          growth_pct?: number | null
          last_synced_at?: string
          likes_total?: number | null
          owner_id: string
          platform: string
          raw?: Json | null
          social_account_id: string
          updated_at?: string
          username?: string | null
          views_total?: number | null
        }
        Update: {
          avatar_url?: string | null
          content_count?: number | null
          display_name?: string | null
          followers?: number | null
          following?: number | null
          growth?: number | null
          growth_pct?: number | null
          last_synced_at?: string
          likes_total?: number | null
          owner_id?: string
          platform?: string
          raw?: Json | null
          social_account_id?: string
          updated_at?: string
          username?: string | null
          views_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zernio_account_stats_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: true
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      zernio_post_analytics: {
        Row: {
          caption: string | null
          clicks: number | null
          comments: number | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          likes: number | null
          owner_id: string
          platform: string
          platform_post_id: string | null
          platform_post_url: string | null
          posted_at: string | null
          raw: Json | null
          reach: number | null
          saves: number | null
          shares: number | null
          social_account_id: string | null
          synced_at: string
          thumbnail_url: string | null
          views: number | null
          zernio_post_id: string | null
        }
        Insert: {
          caption?: string | null
          clicks?: number | null
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          owner_id: string
          platform: string
          platform_post_id?: string | null
          platform_post_url?: string | null
          posted_at?: string | null
          raw?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          social_account_id?: string | null
          synced_at?: string
          thumbnail_url?: string | null
          views?: number | null
          zernio_post_id?: string | null
        }
        Update: {
          caption?: string | null
          clicks?: number | null
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          owner_id?: string
          platform?: string
          platform_post_id?: string | null
          platform_post_url?: string | null
          posted_at?: string | null
          raw?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          social_account_id?: string | null
          synced_at?: string
          thumbnail_url?: string | null
          views?: number | null
          zernio_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zernio_post_analytics_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      post_prediction_overview: {
        Row: {
          any_evaluated: boolean | null
          avg_score: number | null
          by_platform: Json | null
          model_version: string | null
          owner_id: string | null
          scheduled_post_id: string | null
          total_predicted_views: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_predictions_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      create_script_with_animations: {
        Args: {
          _ai_summary: string
          _animations: Json
          _audio_upload_id: string
          _avatar_target?: string
          _caption?: string
          _content_bucket?: string
          _cta: string
          _development: string
          _estimated_wpm: number
          _format_id: string
          _generated_script: string
          _generation_warning?: string
          _hashtags?: string[]
          _hook: string
          _hook_alternatives?: string[]
          _hook_reference?: string
          _idea_reference_id?: string
          _mental_model?: string
          _on_screen_text?: string
          _part_number?: number
          _platform_codes?: string[]
          _raw_concept: string
          _reference_mode?: string
          _referent_video_id?: string
          _seo_keywords?: string[]
          _series_id?: string
          _shape_id?: string
          _storytelling_conflict?: string
          _storytelling_resolution?: string
          _storytelling_setup?: string
          _title: string
          _tone: string
          _visual_hook_format?: number
          _why_it_works?: string
          _word_count: number
        }
        Returns: string
      }
      create_script_with_brolls: {
        Args: {
          _ai_summary: string
          _audio_upload_id: string
          _avatar_target?: string
          _brolls: Json
          _caption?: string
          _content_bucket?: string
          _cta: string
          _development: string
          _estimated_wpm: number
          _format_id: string
          _generated_script: string
          _generation_warning?: string
          _hashtags?: string[]
          _hook: string
          _hook_alternatives?: string[]
          _hook_reference?: string
          _idea_reference_id?: string
          _mental_model?: string
          _on_screen_text?: string
          _part_number?: number
          _platform_codes?: string[]
          _raw_concept: string
          _reference_mode?: string
          _referent_video_id?: string
          _seo_keywords?: string[]
          _series_id?: string
          _shape_id?: string
          _storytelling_conflict?: string
          _storytelling_resolution?: string
          _storytelling_setup?: string
          _title: string
          _tone: string
          _visual_hook_format?: number
          _why_it_works?: string
          _word_count: number
        }
        Returns: string
      }
      dispatch_batch_tick: { Args: never; Returns: undefined }
      dispatch_clip_analysis_tick: { Args: never; Returns: undefined }
      dispatch_engagement_draft_tick: { Args: never; Returns: undefined }
      dispatch_prediction_eval_tick: { Args: never; Returns: undefined }
      dispatch_scheduler_tick: { Args: never; Returns: undefined }
      dispatch_sync_videos_zernio_tick: { Args: never; Returns: undefined }
      dispatch_zernio_analytics_tick: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_brolls_for_script: {
        Args: { _brolls: Json; _script_id: string }
        Returns: number
      }
      replace_publishing_slots: {
        Args: { _slots: Json }
        Returns: {
          active: boolean
          created_at: string
          hour: number
          id: string
          minute: number
          owner_id: string
          weekday: number
        }[]
        SetofOptions: {
          from: "*"
          to: "publishing_slots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "advisor"
      editing_style: "basic" | "intermediate" | "advanced"
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
      virality_tier: "outlier" | "5x" | "3x" | "normal" | "underperform"
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
      editing_style: ["basic", "intermediate", "advanced"],
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
      virality_tier: ["outlier", "5x", "3x", "normal", "underperform"],
    },
  },
} as const

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_content: {
        Row: {
          business_id: string
          content: string
          content_type: Database["public"]["Enums"]["ai_content_type"]
          created_at: string
          id: string
          is_used: boolean | null
          language: string | null
          metadata: Json | null
          platform: string | null
          prompt: string
          rating: number | null
          tokens_used: number | null
          tone: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          content: string
          content_type?: Database["public"]["Enums"]["ai_content_type"]
          created_at?: string
          id?: string
          is_used?: boolean | null
          language?: string | null
          metadata?: Json | null
          platform?: string | null
          prompt: string
          rating?: number | null
          tokens_used?: number | null
          tone?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          content?: string
          content_type?: Database["public"]["Enums"]["ai_content_type"]
          created_at?: string
          id?: string
          is_used?: boolean | null
          language?: string | null
          metadata?: Json | null
          platform?: string | null
          prompt?: string
          rating?: number | null
          tokens_used?: number | null
          tone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_content_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          business_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          run_count: number | null
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          run_count?: number | null
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          run_count?: number | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_events: {
        Row: {
          bundle_id: string
          business_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          source: string | null
          user_id: string | null
        }
        Insert: {
          bundle_id: string
          business_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          source?: string | null
          user_id?: string | null
        }
        Update: {
          bundle_id?: string
          business_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_events_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          is_optional: boolean
          product_id: string
          quantity: number
          sort_order: number
          unit_price_kes: number
          updated_at: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          is_optional?: boolean
          product_id: string
          quantity?: number
          sort_order?: number
          unit_price_kes?: number
          updated_at?: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          is_optional?: boolean
          product_id?: string
          quantity?: number
          sort_order?: number
          unit_price_kes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_suggestions: {
        Row: {
          business_id: string
          computed_at: string
          id: string
          is_dismissed: boolean
          product_ids: string[]
          rationale: string | null
          score: number
          source: string
        }
        Insert: {
          business_id: string
          computed_at?: string
          id?: string
          is_dismissed?: boolean
          product_ids: string[]
          rationale?: string | null
          score?: number
          source?: string
        }
        Update: {
          business_id?: string
          computed_at?: string
          id?: string
          is_dismissed?: boolean
          product_ids?: string[]
          rationale?: string | null
          score?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_suggestions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string | null
          display_on_profile: boolean
          id: string
          is_active: boolean
          items: Json
          name: string
          price_kes: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_on_profile?: boolean
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          price_kes?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_on_profile?: boolean
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          price_kes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      burnout_risk_scores: {
        Row: {
          brs_value: number
          brs_zone: string
          calculated_at: string
          id: string
          recommended_action: string | null
          signal_breakdown: Json | null
          user_id: string
        }
        Insert: {
          brs_value: number
          brs_zone: string
          calculated_at?: string
          id?: string
          recommended_action?: string | null
          signal_breakdown?: Json | null
          user_id: string
        }
        Update: {
          brs_value?: number
          brs_zone?: string
          calculated_at?: string
          id?: string
          recommended_action?: string | null
          signal_breakdown?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      business_health_score: {
        Row: {
          business_id: string
          computed_at: string
          engagement_component: number
          factors: Json
          growth_component: number
          id: string
          inventory_component: number
          overall: number
          voc_component: number
        }
        Insert: {
          business_id: string
          computed_at?: string
          engagement_component?: number
          factors?: Json
          growth_component?: number
          id?: string
          inventory_component?: number
          overall?: number
          voc_component?: number
        }
        Update: {
          business_id?: string
          computed_at?: string
          engagement_component?: number
          factors?: Json
          growth_component?: number
          id?: string
          inventory_component?: number
          overall?: number
          voc_component?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_health_score_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_health_score_history: {
        Row: {
          business_id: string
          created_at: string
          engagement_component: number
          factors: Json
          growth_component: number
          id: string
          inventory_component: number
          overall: number
          snapshot_date: string
          voc_component: number
        }
        Insert: {
          business_id: string
          created_at?: string
          engagement_component: number
          factors?: Json
          growth_component: number
          id?: string
          inventory_component: number
          overall: number
          snapshot_date?: string
          voc_component: number
        }
        Update: {
          business_id?: string
          created_at?: string
          engagement_component?: number
          factors?: Json
          growth_component?: number
          id?: string
          inventory_component?: number
          overall?: number
          snapshot_date?: string
          voc_component?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_health_score_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_locations: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          created_by: string | null
          geo_label: string | null
          id: string
          is_primary: boolean
          lat: number
          lng: number
          name: string
          service_radius_km: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          geo_label?: string | null
          id?: string
          is_primary?: boolean
          lat: number
          lng: number
          name: string
          service_radius_km?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          geo_label?: string | null
          id?: string
          is_primary?: boolean
          lat?: number
          lng?: number
          name?: string
          service_radius_km?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          permissions: Json | null
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_public_profiles: {
        Row: {
          business_id: string
          created_at: string
          hero_image_url: string | null
          id: string
          is_published: boolean
          show_bundles: boolean
          show_health_score: boolean
          show_voc_highlights: boolean
          slug: string
          tagline: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          business_id: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          show_bundles?: boolean
          show_health_score?: boolean
          show_voc_highlights?: boolean
          slug: string
          tagline?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          show_bundles?: boolean
          show_health_score?: boolean
          show_voc_highlights?: boolean
          slug?: string
          tagline?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_public_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_sentiment_daily: {
        Row: {
          avg_score: number | null
          business_id: string
          date: string
          negative: number
          neutral: number
          positive: number
          top_keywords: Json
          top_themes: Json
          total: number
          updated_at: string
        }
        Insert: {
          avg_score?: number | null
          business_id: string
          date: string
          negative?: number
          neutral?: number
          positive?: number
          top_keywords?: Json
          top_themes?: Json
          total?: number
          updated_at?: string
        }
        Update: {
          avg_score?: number | null
          business_id?: string
          date?: string
          negative?: number
          neutral?: number
          positive?: number
          top_keywords?: Json
          top_themes?: Json
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_sentiment_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_type: Database["public"]["Enums"]["business_type"] | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          metadata: Json | null
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          owner_id: string
          phone: string | null
          registration_number: string | null
          settings: Json | null
          slug: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          metadata?: Json | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          owner_id: string
          phone?: string | null
          registration_number?: string | null
          settings?: Json | null
          slug?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          metadata?: Json | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          owner_id?: string
          phone?: string | null
          registration_number?: string | null
          settings?: Json | null
          slug?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          business_id: string
          color: string | null
          created_at: string
          description: string | null
          end_date: string | null
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          id: string
          linked_campaign_id: string | null
          linked_post_id: string | null
          metadata: Json | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          business_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          linked_campaign_id?: string | null
          linked_post_id?: string | null
          metadata?: Json | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          business_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          linked_campaign_id?: string | null
          linked_post_id?: string | null
          metadata?: Json | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_linked_campaign_id_fkey"
            columns: ["linked_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number | null
          business_id: string
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          end_date: string | null
          id: string
          metrics: Json | null
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_channels: Database["public"]["Enums"]["channel_type"][] | null
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          business_id: string
          created_at?: string
          created_by: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json | null
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_channels?: Database["public"]["Enums"]["channel_type"][] | null
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          business_id?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json | null
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_channels?: Database["public"]["Enums"]["channel_type"][] | null
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          metrics: Json | null
          name: string
          notes: string | null
          social_handles: Json | null
          swot: Json | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          metrics?: Json | null
          name: string
          notes?: string | null
          social_handles?: Json | null
          swot?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          metrics?: Json | null
          name?: string
          notes?: string | null
          social_handles?: Json | null
          swot?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          business_id: string
          created_at: string
          currency: string | null
          description: string | null
          end_date: string | null
          freelancer_id: string
          id: string
          job_id: string | null
          metadata: Json | null
          rate: number
          rate_type: Database["public"]["Enums"]["budget_type"] | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          title: string
          total_paid: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          freelancer_id: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          rate: number
          rate_type?: Database["public"]["Enums"]["budget_type"] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          title: string
          total_paid?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          freelancer_id?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          rate?: number
          rate_type?: Database["public"]["Enums"]["budget_type"] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          title?: string
          total_paid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          business_id: string
          channel_id: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          customer_id: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json | null
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string | null
          tags: string[] | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          channel_id?: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          customer_id: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          channel_id?: string | null
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          customer_id?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "social_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_events: {
        Row: {
          crisis_confidence: number | null
          follow_up_completed: boolean | null
          follow_up_scheduled_at: string | null
          id: string
          monitoring_active: boolean | null
          resources_displayed: Json | null
          trigger_source: string | null
          trigger_type: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          crisis_confidence?: number | null
          follow_up_completed?: boolean | null
          follow_up_scheduled_at?: string | null
          id?: string
          monitoring_active?: boolean | null
          resources_displayed?: Json | null
          trigger_source?: string | null
          trigger_type: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          crisis_confidence?: number | null
          follow_up_completed?: boolean | null
          follow_up_scheduled_at?: string | null
          id?: string
          monitoring_active?: boolean | null
          resources_displayed?: Json | null
          trigger_source?: string | null
          trigger_type?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      csat_responses: {
        Row: {
          assigned_agent_id: string | null
          business_id: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          comment: string | null
          conversation_id: string
          created_at: string
          customer_id: string
          id: string
          rating: number
          responded_at: string
          survey_id: string
        }
        Insert: {
          assigned_agent_id?: string | null
          business_id: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          comment?: string | null
          conversation_id: string
          created_at?: string
          customer_id: string
          id?: string
          rating: number
          responded_at?: string
          survey_id: string
        }
        Update: {
          assigned_agent_id?: string | null
          business_id?: string
          channel_type?: Database["public"]["Enums"]["channel_type"]
          comment?: string | null
          conversation_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          rating?: number
          responded_at?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csat_responses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_responses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_responses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "csat_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      csat_surveys: {
        Row: {
          business_id: string
          comment_prompt: string | null
          created_at: string
          delay_minutes: number | null
          id: string
          include_comment: boolean | null
          is_active: boolean | null
          is_default: boolean | null
          name: string
          question: string
          scale_type: string
          thank_you_message: string | null
          trigger_on_resolution: boolean | null
          updated_at: string
        }
        Insert: {
          business_id: string
          comment_prompt?: string | null
          created_at?: string
          delay_minutes?: number | null
          id?: string
          include_comment?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          question?: string
          scale_type?: string
          thank_you_message?: string | null
          trigger_on_resolution?: boolean | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          comment_prompt?: string | null
          created_at?: string
          delay_minutes?: number | null
          id?: string
          include_comment?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          question?: string
          scale_type?: string
          thank_you_message?: string | null
          trigger_on_resolution?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "csat_surveys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          business_id: string
          created_at: string
          customer_count: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_dynamic: boolean | null
          name: string
          rules: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_count?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_dynamic?: boolean | null
          name: string
          rules?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_count?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_dynamic?: boolean | null
          name?: string
          rules?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sentiment_log: {
        Row: {
          analyzed_at: string
          business_id: string
          conversation_id: string | null
          created_at: string
          customer_id: string | null
          geo_label: string | null
          id: string
          keywords: string[]
          language: string
          message_id: string | null
          raw_text: string | null
          score: number
          sentiment: string
          source: string
          themes: string[]
        }
        Insert: {
          analyzed_at?: string
          business_id: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          geo_label?: string | null
          id?: string
          keywords?: string[]
          language?: string
          message_id?: string | null
          raw_text?: string | null
          score: number
          sentiment: string
          source?: string
          themes?: string[]
        }
        Update: {
          analyzed_at?: string
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          geo_label?: string | null
          id?: string
          keywords?: string[]
          language?: string
          message_id?: string | null
          raw_text?: string | null
          score?: number
          sentiment?: string
          source?: string
          themes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "customer_sentiment_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          avatar_url: string | null
          business_id: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          email: string | null
          external_id: string | null
          first_contact_at: string | null
          id: string
          last_contact_at: string | null
          metadata: Json | null
          name: string | null
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_id: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_contact_at?: string | null
          id?: string
          last_contact_at?: string | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_id?: string
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_contact_at?: string | null
          id?: string
          last_contact_at?: string | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          business_id: string | null
          category: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          is_published: boolean | null
          order_index: number | null
          question: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          answer: string
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          question: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          answer?: string
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          question?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_forms: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          require_contact: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          require_contact?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          require_contact?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_forms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_moderation_log: {
        Row: {
          acted_by: string | null
          business_id: string
          created_at: string
          decision: string
          details: Json
          id: string
          rule_fired: string | null
          submission_id: string
        }
        Insert: {
          acted_by?: string | null
          business_id: string
          created_at?: string
          decision: string
          details?: Json
          id?: string
          rule_fired?: string | null
          submission_id: string
        }
        Update: {
          acted_by?: string | null
          business_id?: string
          created_at?: string
          decision?: string
          details?: Json
          id?: string
          rule_fired?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_moderation_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_moderation_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "feedback_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_moderation_rules: {
        Row: {
          auto_approve_above_score: number | null
          auto_reject_below_score: number | null
          block_languages: string[]
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          max_links: number
          min_message_length: number
          severity_threshold: string
          spam_keywords: string[]
          updated_at: string
        }
        Insert: {
          auto_approve_above_score?: number | null
          auto_reject_below_score?: number | null
          block_languages?: string[]
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_links?: number
          min_message_length?: number
          severity_threshold?: string
          spam_keywords?: string[]
          updated_at?: string
        }
        Update: {
          auto_approve_above_score?: number | null
          auto_reject_below_score?: number | null
          block_languages?: string[]
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_links?: number
          min_message_length?: number
          severity_threshold?: string
          spam_keywords?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_moderation_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_submissions: {
        Row: {
          business_id: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          form_id: string | null
          id: string
          ip_address: unknown
          message: string
          moderated_at: string | null
          moderated_by: string | null
          rating: number | null
          source: string
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          form_id?: string | null
          id?: string
          ip_address?: unknown
          message: string
          moderated_at?: string | null
          moderated_by?: string | null
          rating?: number | null
          source?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          form_id?: string | null
          id?: string
          ip_address?: unknown
          message?: string
          moderated_at?: string | null
          moderated_by?: string | null
          rating?: number | null
          source?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_submissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "feedback_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_profiles: {
        Row: {
          availability:
            | Database["public"]["Enums"]["availability_status"]
            | null
          bio: string | null
          business_id: string | null
          created_at: string
          currency: string | null
          experience_years: number | null
          headline: string | null
          hourly_rate: number | null
          id: string
          is_verified: boolean | null
          languages: string[] | null
          location: string | null
          metadata: Json | null
          portfolio_urls: string[] | null
          rating: number | null
          skills: string[] | null
          total_jobs: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?:
            | Database["public"]["Enums"]["availability_status"]
            | null
          bio?: string | null
          business_id?: string | null
          created_at?: string
          currency?: string | null
          experience_years?: number | null
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          is_verified?: boolean | null
          languages?: string[] | null
          location?: string | null
          metadata?: Json | null
          portfolio_urls?: string[] | null
          rating?: number | null
          skills?: string[] | null
          total_jobs?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?:
            | Database["public"]["Enums"]["availability_status"]
            | null
          bio?: string | null
          business_id?: string | null
          created_at?: string
          currency?: string | null
          experience_years?: number | null
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          is_verified?: boolean | null
          languages?: string[] | null
          location?: string | null
          metadata?: Json | null
          portfolio_urls?: string[] | null
          rating?: number | null
          skills?: string[] | null
          total_jobs?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_entities: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          entity_type: Database["public"]["Enums"]["geo_entity_type"]
          geo_label: string | null
          id: string
          lat: number
          lng: number
          metadata: Json
          name: string
          source: Database["public"]["Enums"]["geo_entity_source"]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          entity_type: Database["public"]["Enums"]["geo_entity_type"]
          geo_label?: string | null
          id?: string
          lat: number
          lng: number
          metadata?: Json
          name: string
          source?: Database["public"]["Enums"]["geo_entity_source"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          entity_type?: Database["public"]["Enums"]["geo_entity_type"]
          geo_label?: string | null
          id?: string
          lat?: number
          lng?: number
          metadata?: Json
          name?: string
          source?: Database["public"]["Enums"]["geo_entity_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_entities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_insights_daily: {
        Row: {
          avg_sentiment: number | null
          business_id: string
          competitor_density: number
          created_at: string
          customer_count: number
          date: string
          geo_label: string
          id: string
          metadata: Json
          opportunity_score: number
        }
        Insert: {
          avg_sentiment?: number | null
          business_id: string
          competitor_density?: number
          created_at?: string
          customer_count?: number
          date: string
          geo_label: string
          id?: string
          metadata?: Json
          opportunity_score?: number
        }
        Update: {
          avg_sentiment?: number | null
          business_id?: string
          competitor_density?: number
          created_at?: string
          customer_count?: number
          date?: string
          geo_label?: string
          id?: string
          metadata?: Json
          opportunity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "geo_insights_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          attachments: Json | null
          cover_letter: string | null
          created_at: string
          freelancer_id: string
          id: string
          job_id: string
          proposed_duration: string | null
          proposed_rate: number | null
          status: Database["public"]["Enums"]["application_status"] | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          cover_letter?: string | null
          created_at?: string
          freelancer_id: string
          id?: string
          job_id: string
          proposed_duration?: string | null
          proposed_rate?: number | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          cover_letter?: string | null
          created_at?: string
          freelancer_id?: string
          id?: string
          job_id?: string
          proposed_duration?: string | null
          proposed_rate?: number | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          applications_count: number | null
          budget_max: number | null
          budget_min: number | null
          budget_type: Database["public"]["Enums"]["budget_type"] | null
          business_id: string
          created_at: string
          created_by: string
          currency: string | null
          deadline: string | null
          description: string | null
          duration: string | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"] | null
          location_type: Database["public"]["Enums"]["location_type"] | null
          skills_required: string[] | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          applications_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"] | null
          business_id: string
          created_at?: string
          created_by: string
          currency?: string | null
          deadline?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"] | null
          location_type?: Database["public"]["Enums"]["location_type"] | null
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          applications_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"] | null
          business_id?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          deadline?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"] | null
          location_type?: Database["public"]["Enums"]["location_type"] | null
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          dominant_emotion: string | null
          entry_mode: string
          id: string
          prompt_text: string
          sentiment_score: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          dominant_emotion?: string | null
          entry_mode: string
          id?: string
          prompt_text: string
          sentiment_score?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          dominant_emotion?: string | null
          entry_mode?: string
          id?: string
          prompt_text?: string
          sentiment_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_pinned: boolean | null
          message: string
          stream_id: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          message: string
          stream_id: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          message?: string
          stream_id?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_destinations: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          platform: string
          rtmp_url: string
          status: string | null
          stream_id: string
          stream_key: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          platform: string
          rtmp_url: string
          status?: string | null
          stream_id: string
          stream_key: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          platform?: string
          rtmp_url?: string
          status?: string | null
          stream_id?: string
          stream_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_destinations_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          business_id: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          peak_viewers: number | null
          platforms: Json | null
          rtmp_url: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["live_stream_status"] | null
          stream_key: string | null
          title: string
          updated_at: string | null
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          peak_viewers?: number | null
          platforms?: Json | null
          rtmp_url?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["live_stream_status"] | null
          stream_key?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          peak_viewers?: number | null
          platforms?: Json | null
          rtmp_url?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["live_stream_status"] | null
          stream_key?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_health_checkins: {
        Row: {
          checked_in_at: string
          created_at: string
          free_text_response: string | null
          id: string
          language_detected: string | null
          mood_score: number
          mood_state: string
          user_id: string
          wellness_tokens_earned: number | null
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          free_text_response?: string | null
          id?: string
          language_detected?: string | null
          mood_score: number
          mood_state: string
          user_id: string
          wellness_tokens_earned?: number | null
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          free_text_response?: string | null
          id?: string
          language_detected?: string | null
          mood_score?: number
          mood_state?: string
          user_id?: string
          wellness_tokens_earned?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          conversation_id: string
          created_at: string
          external_id: string | null
          id: string
          is_internal: boolean | null
          metadata: Json | null
          sender_id: string | null
          sender_type: Database["public"]["Enums"]["sender_type"]
          status: Database["public"]["Enums"]["message_status"]
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          conversation_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type: Database["public"]["Enums"]["sender_type"]
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          conversation_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: Database["public"]["Enums"]["sender_type"]
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          business_id: string
          clicked_at: string | null
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          business_id: string
          clicked_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          business_id?: string
          clicked_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      post_templates: {
        Row: {
          business_id: string
          category: string | null
          content: string
          created_at: string | null
          hashtags: string[] | null
          id: string
          media_urls: string[] | null
          name: string
          platforms: Database["public"]["Enums"]["channel_type"][] | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          business_id: string
          category?: string | null
          content: string
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: string[] | null
          name: string
          platforms?: Database["public"]["Enums"]["channel_type"][] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          business_id?: string
          category?: string | null
          content?: string
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: string[] | null
          name?: string
          platforms?: Database["public"]["Enums"]["channel_type"][] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          buying_price: number
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          current_stock: number
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          reorder_level: number
          selling_price: number
          sku: string | null
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          business_id: string
          buying_price?: number
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          current_stock?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          reorder_level?: number
          selling_price?: number
          sku?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          buying_price?: number
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          current_stock?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          reorder_level?: number
          selling_price?: number
          sku?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          kyc_document_url: string | null
          kyc_status: Database["public"]["Enums"]["verification_status"] | null
          language: string | null
          last_login_at: string | null
          location: string | null
          phone: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          kyc_document_url?: string | null
          kyc_status?: Database["public"]["Enums"]["verification_status"] | null
          language?: string | null
          last_login_at?: string | null
          location?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          kyc_document_url?: string | null
          kyc_status?: Database["public"]["Enums"]["verification_status"] | null
          language?: string | null
          last_login_at?: string | null
          location?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          business_id: string
          category: string | null
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          shortcut: string | null
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          business_id: string
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          business_id?: string
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          title?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          contract_id: string
          created_at: string
          id: string
          rating: number
          review_type: Database["public"]["Enums"]["review_type"]
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          contract_id: string
          created_at?: string
          id?: string
          rating: number
          review_type: Database["public"]["Enums"]["review_type"]
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_type?: Database["public"]["Enums"]["review_type"]
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          business_id: string
          campaign_id: string | null
          channel_id: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          content: string
          created_at: string
          created_by: string
          error_message: string | null
          external_post_id: string | null
          hashtags: string[] | null
          id: string
          link_preview: Json | null
          media_urls: string[] | null
          mentions: string[] | null
          metrics: Json | null
          platform_settings: Json | null
          published_at: string | null
          scheduled_for: string
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          campaign_id?: string | null
          channel_id?: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          content: string
          created_at?: string
          created_by: string
          error_message?: string | null
          external_post_id?: string | null
          hashtags?: string[] | null
          id?: string
          link_preview?: Json | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metrics?: Json | null
          platform_settings?: Json | null
          published_at?: string | null
          scheduled_for: string
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          campaign_id?: string | null
          channel_id?: string | null
          channel_type?: Database["public"]["Enums"]["channel_type"]
          content?: string
          created_at?: string
          created_by?: string
          error_message?: string | null
          external_post_id?: string | null
          hashtags?: string[] | null
          id?: string
          link_preview?: Json | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metrics?: Json | null
          platform_settings?: Json | null
          published_at?: string | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "social_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      security_check_runs: {
        Row: {
          check_type: string
          commit_sha: string | null
          created_at: string
          environment: string
          id: string
          ran_by: string | null
          results: Json
          status: string
          summary: string | null
        }
        Insert: {
          check_type: string
          commit_sha?: string | null
          created_at?: string
          environment?: string
          id?: string
          ran_by?: string | null
          results?: Json
          status: string
          summary?: string | null
        }
        Update: {
          check_type?: string
          commit_sha?: string | null
          created_at?: string
          environment?: string
          id?: string
          ran_by?: string | null
          results?: Json
          status?: string
          summary?: string | null
        }
        Relationships: []
      }
      security_findings: {
        Row: {
          commit_sha: string | null
          created_at: string
          description: string | null
          detected_at: string
          finding_internal_id: string
          id: string
          metadata: Json
          name: string
          remediation_link: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          scanner_name: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          commit_sha?: string | null
          created_at?: string
          description?: string | null
          detected_at?: string
          finding_internal_id: string
          id?: string
          metadata?: Json
          name: string
          remediation_link?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scanner_name: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          commit_sha?: string | null
          created_at?: string
          description?: string | null
          detected_at?: string
          finding_internal_id?: string
          id?: string
          metadata?: Json
          name?: string
          remediation_link?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scanner_name?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      segment_customers: {
        Row: {
          added_at: string
          customer_id: string
          id: string
          segment_id: string
        }
        Insert: {
          added_at?: string
          customer_id: string
          id?: string
          segment_id: string
        }
        Update: {
          added_at?: string
          customer_id?: string
          id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_customers_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_breach_logs: {
        Row: {
          actual_minutes: number
          assigned_to: string | null
          breach_type: string
          business_id: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          conversation_id: string
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          target_minutes: number
        }
        Insert: {
          actual_minutes: number
          assigned_to?: string | null
          breach_type: string
          business_id: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          conversation_id: string
          created_at?: string
          id?: string
          priority: Database["public"]["Enums"]["priority_level"]
          target_minutes: number
        }
        Update: {
          actual_minutes?: number
          assigned_to?: string | null
          breach_type?: string
          business_id?: string
          channel_type?: Database["public"]["Enums"]["channel_type"]
          conversation_id?: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          target_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "sla_breach_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breach_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          business_hours: Json | null
          business_id: string
          channel_overrides: Json | null
          created_at: string
          description: string | null
          first_response_target: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          priority_overrides: Json | null
          resolution_target: number
          updated_at: string
          warning_threshold: number
        }
        Insert: {
          business_hours?: Json | null
          business_id: string
          channel_overrides?: Json | null
          created_at?: string
          description?: string | null
          first_response_target?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          priority_overrides?: Json | null
          resolution_target?: number
          updated_at?: string
          warning_threshold?: number
        }
        Update: {
          business_hours?: Json | null
          business_id?: string
          channel_overrides?: Json | null
          created_at?: string
          description?: string | null
          first_response_target?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          priority_overrides?: Json | null
          resolution_target?: number
          updated_at?: string
          warning_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_tracking: {
        Row: {
          conversation_id: string
          created_at: string
          first_customer_message_at: string | null
          first_response_at: string | null
          first_response_breached: boolean | null
          first_response_time: number | null
          first_response_warning_sent: boolean | null
          id: string
          paused_at: string | null
          resolution_breached: boolean | null
          resolution_time: number | null
          resolution_warning_sent: boolean | null
          resolved_at: string | null
          sla_policy_id: string | null
          total_paused_minutes: number | null
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          first_customer_message_at?: string | null
          first_response_at?: string | null
          first_response_breached?: boolean | null
          first_response_time?: number | null
          first_response_warning_sent?: boolean | null
          id?: string
          paused_at?: string | null
          resolution_breached?: boolean | null
          resolution_time?: number | null
          resolution_warning_sent?: boolean | null
          resolved_at?: string | null
          sla_policy_id?: string | null
          total_paused_minutes?: number | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          first_customer_message_at?: string | null
          first_response_at?: string | null
          first_response_breached?: boolean | null
          first_response_time?: number | null
          first_response_warning_sent?: boolean | null
          id?: string
          paused_at?: string | null
          resolution_breached?: boolean | null
          resolution_time?: number | null
          resolution_warning_sent?: boolean | null
          resolved_at?: string | null
          sla_policy_id?: string | null
          total_paused_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_tracking_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_tracking_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_channels: {
        Row: {
          access_token: string | null
          business_id: string
          channel_id: string | null
          channel_name: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          connected_at: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_connected: boolean | null
          metadata: Json | null
          refresh_token: string | null
          settings: Json | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          business_id: string
          channel_id?: string | null
          channel_name?: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          metadata?: Json | null
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          business_id?: string
          channel_id?: string | null
          channel_name?: string | null
          channel_type?: Database["public"]["Enums"]["channel_type"]
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          metadata?: Json | null
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_channels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_stock: number
          note: string | null
          previous_stock: number
          product_id: string
          quantity_change: number
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_stock: number
          note?: string | null
          previous_stock: number
          product_id: string
          quantity_change: number
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          new_stock?: number
          note?: string | null
          previous_stock?: number
          product_id?: string
          quantity_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_overlays: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_visible: boolean | null
          name: string
          position: Json | null
          size: Json | null
          stream_id: string | null
          type: string
          updated_at: string | null
          user_id: string
          z_index: number | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          name: string
          position?: Json | null
          size?: Json | null
          stream_id?: string | null
          type?: string
          updated_at?: string | null
          user_id: string
          z_index?: number | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          name?: string
          position?: Json | null
          size?: Json | null
          stream_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          z_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_overlays_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_polls: {
        Row: {
          created_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          options: Json
          question: string
          stream_id: string
          votes: Json | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json
          question: string
          stream_id: string
          votes?: Json | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json
          question?: string
          stream_id?: string
          votes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_polls_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          product_categories: string[] | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          product_categories?: string[] | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          product_categories?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          business_id: string
          category: Database["public"]["Enums"]["ticket_category"] | null
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          business_id: string
          category?: Database["public"]["Enums"]["ticket_category"] | null
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          business_id?: string
          category?: Database["public"]["Enums"]["ticket_category"] | null
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role: string
          status: string
          token: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: string
          status?: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          business_id: string
          completed_at: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          external_reference: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          recipient_email: string | null
          recipient_phone: string | null
          reference: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          business_id: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_reference?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_reference?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mfa_settings: {
        Row: {
          backup_codes_hash: string[] | null
          created_at: string | null
          id: string
          is_mfa_enabled: boolean | null
          last_verified_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes_hash?: string[] | null
          created_at?: string | null
          id?: string
          is_mfa_enabled?: boolean | null
          last_verified_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes_hash?: string[] | null
          created_at?: string | null
          id?: string
          is_mfa_enabled?: boolean | null
          last_verified_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_settings: {
        Row: {
          compact_mode: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          notification_sound: boolean | null
          notify_campaign_updates: boolean | null
          notify_new_message: boolean | null
          notify_new_order: boolean | null
          notify_team_activity: boolean | null
          notify_weekly_digest: boolean | null
          preferences: Json
          push_notifications: boolean | null
          sms_notifications: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          compact_mode?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          notification_sound?: boolean | null
          notify_campaign_updates?: boolean | null
          notify_new_message?: boolean | null
          notify_new_order?: boolean | null
          notify_team_activity?: boolean | null
          notify_weekly_digest?: boolean | null
          preferences?: Json
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          compact_mode?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          notification_sound?: boolean | null
          notify_campaign_updates?: boolean | null
          notify_new_message?: boolean | null
          notify_new_order?: boolean | null
          notify_team_activity?: boolean | null
          notify_weekly_digest?: boolean | null
          preferences?: Json
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          business_id: string
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          business_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          business_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_entries: {
        Row: {
          ai_response: string | null
          business_id: string | null
          content: string | null
          created_at: string | null
          entry_type: string
          id: string
          mood: string | null
          mood_value: number | null
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          business_id?: string | null
          content?: string | null
          created_at?: string | null
          entry_type: string
          id?: string
          mood?: string | null
          mood_value?: number | null
          user_id: string
        }
        Update: {
          ai_response?: string | null
          business_id?: string | null
          content?: string | null
          created_at?: string | null
          entry_type?: string
          id?: string
          mood?: string | null
          mood_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_tokens: {
        Row: {
          balance_after: number
          created_at: string
          id: string
          reference_id: string | null
          token_amount: number
          transaction_type: string
          user_id: string
        }
        Insert: {
          balance_after?: number
          created_at?: string
          id?: string
          reference_id?: string | null
          token_amount: number
          transaction_type: string
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          id?: string
          reference_id?: string | null
          token_amount?: number
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      wins_vault: {
        Row: {
          brs_at_time_of_win: number | null
          created_at: string
          id: string
          user_id: string
          win_text: string
          win_type: string | null
        }
        Insert: {
          brs_at_time_of_win?: number | null
          created_at?: string
          id?: string
          user_id: string
          win_text: string
          win_type?: string | null
        }
        Update: {
          brs_at_time_of_win?: number | null
          created_at?: string
          id?: string
          user_id?: string
          win_text?: string
          win_type?: string | null
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          context: Json
          current_step: number | null
          customer_id: string | null
          error_message: string | null
          id: string
          next_step_at: string | null
          started_at: string
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json
          current_step?: number | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          next_step_at?: string | null
          started_at?: string
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          context?: Json
          current_step?: number | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          next_step_at?: string | null
          started_at?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string | null
          step_order: number
          step_type: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name?: string | null
          step_order: number
          step_type: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string | null
          step_order?: number
          step_type?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_sla_breaches: { Args: never; Returns: number }
      compute_business_health_score: {
        Args: { p_business_id: string }
        Returns: Json
      }
      get_channel_tokens: { Args: { p_channel_id: string }; Returns: Json }
      get_csat_by_agent: {
        Args: {
          p_business_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          agent_id: string
          agent_name: string
          avg_rating: number
          total_responses: number
        }[]
      }
      get_csat_by_channel: {
        Args: {
          p_business_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          avg_rating: number
          channel_type: Database["public"]["Enums"]["channel_type"]
          total_responses: number
        }[]
      }
      get_csat_metrics: {
        Args: {
          p_business_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          avg_rating: number
          nps_score: number
          rating_1_count: number
          rating_2_count: number
          rating_3_count: number
          rating_4_count: number
          rating_5_count: number
          response_rate: number
          total_responses: number
        }[]
      }
      get_customer_masked: { Args: { p_customer_id: string }; Returns: Json }
      get_effective_sla_targets: {
        Args: {
          p_business_id: string
          p_channel_type: Database["public"]["Enums"]["channel_type"]
          p_priority: Database["public"]["Enums"]["priority_level"]
        }
        Returns: {
          first_response_target: number
          policy_id: string
          resolution_target: number
          warning_threshold: number
        }[]
      }
      get_public_business_profile: { Args: { p_slug: string }; Returns: Json }
      get_safe_channels: {
        Args: { p_business_id: string }
        Returns: {
          business_id: string
          channel_name: string
          channel_type: string
          connected_at: string
          created_at: string
          id: string
          is_active: boolean
          is_connected: boolean
          metadata: Json
          settings: Json
          updated_at: string
        }[]
      }
      get_sla_metrics: {
        Args: {
          p_business_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          avg_first_response_minutes: number
          avg_resolution_minutes: number
          first_response_breach_count: number
          first_response_compliance_rate: number
          resolution_breach_count: number
          resolution_compliance_rate: number
          total_conversations: number
        }[]
      }
      get_stream_credentials: { Args: { p_stream_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_business_member: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_owner: {
        Args: { p_business_id: string; p_user_id: string }
        Returns: boolean
      }
      is_business_slug_available: { Args: { p_slug: string }; Returns: boolean }
      is_feedback_slug_available: { Args: { p_slug: string }; Returns: boolean }
      log_security_event: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      log_user_action: {
        Args: {
          p_action: string
          p_business_id?: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
        }
        Returns: string
      }
      snapshot_all_health_scores: { Args: never; Returns: number }
    }
    Enums: {
      ai_content_type:
        | "caption"
        | "description"
        | "email"
        | "sms"
        | "blog"
        | "ad_copy"
        | "hashtags"
      app_role:
        | "admin"
        | "moderator"
        | "business_owner"
        | "team_member"
        | "freelancer"
      application_status:
        | "pending"
        | "shortlisted"
        | "accepted"
        | "rejected"
        | "withdrawn"
      availability_status: "available" | "busy" | "unavailable"
      budget_type: "fixed" | "hourly"
      business_type:
        | "retail"
        | "services"
        | "manufacturing"
        | "agriculture"
        | "technology"
        | "hospitality"
        | "healthcare"
        | "education"
        | "other"
      calendar_event_type:
        | "post"
        | "campaign"
        | "reminder"
        | "holiday"
        | "custom"
      campaign_status:
        | "draft"
        | "scheduled"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      campaign_type: "social" | "email" | "sms" | "multi_channel"
      channel_type:
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "tiktok"
        | "twitter"
        | "telegram"
        | "sms"
        | "email"
      content_type:
        | "text"
        | "image"
        | "audio"
        | "video"
        | "document"
        | "location"
        | "template"
      contract_status:
        | "pending"
        | "active"
        | "completed"
        | "cancelled"
        | "disputed"
      conversation_status: "open" | "pending" | "resolved" | "archived"
      geo_entity_source: "manual" | "google_places" | "csv"
      geo_entity_type:
        | "competitor"
        | "supplier"
        | "customer_cluster"
        | "event"
        | "landmark"
      job_status: "draft" | "open" | "in_progress" | "completed" | "cancelled"
      job_type: "one_time" | "ongoing" | "full_time" | "part_time"
      live_stream_status: "preparing" | "live" | "ended" | "failed"
      location_type: "remote" | "onsite" | "hybrid"
      message_status: "pending" | "sent" | "delivered" | "read" | "failed"
      notification_type:
        | "new_message"
        | "assignment"
        | "mention"
        | "status_change"
      post_status: "draft" | "scheduled" | "publishing" | "published" | "failed"
      priority_level: "low" | "normal" | "high" | "urgent"
      product_category:
        | "fashion"
        | "food_beverage"
        | "electronics"
        | "beauty"
        | "general_merchandise"
        | "other"
      review_type: "client_to_freelancer" | "freelancer_to_client"
      sender_type: "customer" | "agent" | "system" | "bot"
      stock_movement_type: "sale" | "restock" | "adjustment" | "loss"
      ticket_category:
        | "technical"
        | "billing"
        | "feature_request"
        | "bug_report"
        | "general"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_response"
        | "resolved"
        | "closed"
      transaction_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "payment"
        | "refund"
        | "transfer"
      verification_status: "pending" | "verified" | "rejected" | "expired"
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
      ai_content_type: [
        "caption",
        "description",
        "email",
        "sms",
        "blog",
        "ad_copy",
        "hashtags",
      ],
      app_role: [
        "admin",
        "moderator",
        "business_owner",
        "team_member",
        "freelancer",
      ],
      application_status: [
        "pending",
        "shortlisted",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      availability_status: ["available", "busy", "unavailable"],
      budget_type: ["fixed", "hourly"],
      business_type: [
        "retail",
        "services",
        "manufacturing",
        "agriculture",
        "technology",
        "hospitality",
        "healthcare",
        "education",
        "other",
      ],
      calendar_event_type: [
        "post",
        "campaign",
        "reminder",
        "holiday",
        "custom",
      ],
      campaign_status: [
        "draft",
        "scheduled",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      campaign_type: ["social", "email", "sms", "multi_channel"],
      channel_type: [
        "whatsapp",
        "instagram",
        "facebook",
        "tiktok",
        "twitter",
        "telegram",
        "sms",
        "email",
      ],
      content_type: [
        "text",
        "image",
        "audio",
        "video",
        "document",
        "location",
        "template",
      ],
      contract_status: [
        "pending",
        "active",
        "completed",
        "cancelled",
        "disputed",
      ],
      conversation_status: ["open", "pending", "resolved", "archived"],
      geo_entity_source: ["manual", "google_places", "csv"],
      geo_entity_type: [
        "competitor",
        "supplier",
        "customer_cluster",
        "event",
        "landmark",
      ],
      job_status: ["draft", "open", "in_progress", "completed", "cancelled"],
      job_type: ["one_time", "ongoing", "full_time", "part_time"],
      live_stream_status: ["preparing", "live", "ended", "failed"],
      location_type: ["remote", "onsite", "hybrid"],
      message_status: ["pending", "sent", "delivered", "read", "failed"],
      notification_type: [
        "new_message",
        "assignment",
        "mention",
        "status_change",
      ],
      post_status: ["draft", "scheduled", "publishing", "published", "failed"],
      priority_level: ["low", "normal", "high", "urgent"],
      product_category: [
        "fashion",
        "food_beverage",
        "electronics",
        "beauty",
        "general_merchandise",
        "other",
      ],
      review_type: ["client_to_freelancer", "freelancer_to_client"],
      sender_type: ["customer", "agent", "system", "bot"],
      stock_movement_type: ["sale", "restock", "adjustment", "loss"],
      ticket_category: [
        "technical",
        "billing",
        "feature_request",
        "bug_report",
        "general",
      ],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_response",
        "resolved",
        "closed",
      ],
      transaction_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      transaction_type: [
        "deposit",
        "withdrawal",
        "payment",
        "refund",
        "transfer",
      ],
      verification_status: ["pending", "verified", "rejected", "expired"],
    },
  },
} as const

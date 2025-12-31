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
          id: string
          media_urls: string[] | null
          metrics: Json | null
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
          id?: string
          media_urls?: string[] | null
          metrics?: Json | null
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
          id?: string
          media_urls?: string[] | null
          metrics?: Json | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      conversation_status: "open" | "pending" | "resolved" | "archived"
      message_status: "pending" | "sent" | "delivered" | "read" | "failed"
      post_status: "draft" | "scheduled" | "publishing" | "published" | "failed"
      priority_level: "low" | "normal" | "high" | "urgent"
      sender_type: "customer" | "agent" | "system" | "bot"
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
      conversation_status: ["open", "pending", "resolved", "archived"],
      message_status: ["pending", "sent", "delivered", "read", "failed"],
      post_status: ["draft", "scheduled", "publishing", "published", "failed"],
      priority_level: ["low", "normal", "high", "urgent"],
      sender_type: ["customer", "agent", "system", "bot"],
      verification_status: ["pending", "verified", "rejected", "expired"],
    },
  },
} as const

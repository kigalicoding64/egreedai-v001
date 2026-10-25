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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      chat_provider_access_state: {
        Row: {
          denied: boolean
          provider: string
          reason: string
          updated_at: string
        }
        Insert: {
          denied?: boolean
          provider: string
          reason?: string
          updated_at?: string
        }
        Update: {
          denied?: boolean
          provider?: string
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_audit_log: {
        Row: {
          action: string
          actor: string | null
          actor_email: string | null
          at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          actor_email?: string | null
          at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_email?: string | null
          at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      creator_config: {
        Row: {
          active: boolean
          constitutional_principles: string | null
          created_at: string
          global_instructions: string | null
          id: string
          identity: string | null
          mission: string | null
          personality: string | null
          reasoning_policies: string | null
          response_style: string | null
          scope: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          active?: boolean
          constitutional_principles?: string | null
          created_at?: string
          global_instructions?: string | null
          id?: string
          identity?: string | null
          mission?: string | null
          personality?: string | null
          reasoning_policies?: string | null
          response_style?: string | null
          scope?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          active?: boolean
          constitutional_principles?: string | null
          created_at?: string
          global_instructions?: string | null
          id?: string
          identity?: string | null
          mission?: string | null
          personality?: string | null
          reasoning_policies?: string | null
          response_style?: string | null
          scope?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      creator_knowledge_chunks: {
        Row: {
          active: boolean
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          source_id: string
          tokens: number | null
          version: number
        }
        Insert: {
          active?: boolean
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_id: string
          tokens?: number | null
          version?: number
        }
        Update: {
          active?: boolean
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_id?: string
          tokens?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_knowledge_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "creator_knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_knowledge_sources: {
        Row: {
          approval_state: string
          approved_by: string | null
          confidence: number | null
          config: Json
          created_at: string
          created_by: string | null
          current_version: number
          id: string
          kind: string
          last_ingested_at: string | null
          raw_content: string | null
          schedule: string | null
          scope: string
          scope_ref: string | null
          status: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          approval_state?: string
          approved_by?: string | null
          confidence?: number | null
          config?: Json
          created_at?: string
          created_by?: string | null
          current_version?: number
          id?: string
          kind: string
          last_ingested_at?: string | null
          raw_content?: string | null
          schedule?: string | null
          scope?: string
          scope_ref?: string | null
          status?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          approval_state?: string
          approved_by?: string | null
          confidence?: number | null
          config?: Json
          created_at?: string
          created_by?: string | null
          current_version?: number
          id?: string
          kind?: string
          last_ingested_at?: string | null
          raw_content?: string | null
          schedule?: string | null
          scope?: string
          scope_ref?: string | null
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      creator_knowledge_versions: {
        Row: {
          chunk_count: number
          created_at: string
          created_by: string | null
          id: string
          snapshot: Json
          source_id: string
          version: number
        }
        Insert: {
          chunk_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot?: Json
          source_id: string
          version: number
        }
        Update: {
          chunk_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot?: Json
          source_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_knowledge_versions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "creator_knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      egreed_examples: {
        Row: {
          active: boolean
          content_hash: string | null
          context: string | null
          created_at: string
          dataset: string
          difficulty: string | null
          domain: string
          embedding: string | null
          external_id: string | null
          fts: unknown
          id: string
          instruction: string
          language: string | null
          quality_score: number
          response: string
          task: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          content_hash?: string | null
          context?: string | null
          created_at?: string
          dataset: string
          difficulty?: string | null
          domain?: string
          embedding?: string | null
          external_id?: string | null
          fts?: unknown
          id?: string
          instruction: string
          language?: string | null
          quality_score?: number
          response: string
          task?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          content_hash?: string | null
          context?: string | null
          created_at?: string
          dataset?: string
          difficulty?: string | null
          domain?: string
          embedding?: string | null
          external_id?: string | null
          fts?: unknown
          id?: string
          instruction?: string
          language?: string | null
          quality_score?: number
          response?: string
          task?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gemini_api_keys: {
        Row: {
          active: boolean
          api_key: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          last_error: string | null
          last_used_at: string | null
          position: number
        }
        Insert: {
          active?: boolean
          api_key: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          last_error?: string | null
          last_used_at?: string | null
          position?: number
        }
        Update: {
          active?: boolean
          api_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          last_error?: string | null
          last_used_at?: string | null
          position?: number
        }
        Relationships: []
      }
      knowledge_documents: {
        Row: {
          content: string
          created_at: string
          file_url: string | null
          id: string
          source_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_url?: string | null
          id?: string
          source_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          source_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_servers: {
        Row: {
          active: boolean
          auth_header: string | null
          created_at: string
          created_by: string | null
          id: string
          label: string
          last_checked_at: string | null
          last_error: string | null
          tools: Json
          url: string
        }
        Insert: {
          active?: boolean
          auth_header?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          last_checked_at?: string | null
          last_error?: string | null
          tools?: Json
          url: string
        }
        Update: {
          active?: boolean
          auth_header?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          last_checked_at?: string | null
          last_error?: string | null
          tools?: Json
          url?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
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
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          conversation_history_enabled: boolean
          conversation_retention_days: number
          created_at: string
          id: string
          language_code: string
          language_name: string
          updated_at: string
          user_id: string
          voice_auto_speak: boolean
          voice_enabled: boolean
          voice_speed: number
        }
        Insert: {
          conversation_history_enabled?: boolean
          conversation_retention_days?: number
          created_at?: string
          id?: string
          language_code?: string
          language_name?: string
          updated_at?: string
          user_id: string
          voice_auto_speak?: boolean
          voice_enabled?: boolean
          voice_speed?: number
        }
        Update: {
          conversation_history_enabled?: boolean
          conversation_retention_days?: number
          created_at?: string
          id?: string
          language_code?: string
          language_name?: string
          updated_at?: string
          user_id?: string
          voice_auto_speak?: boolean
          voice_enabled?: boolean
          voice_speed?: number
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
      workspace_activity: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          metadata: Json
          project_id: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message: string
          metadata?: Json
          project_id?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          metadata?: Json
          project_id?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "workspace_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "workspace_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_projects: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json
          name: string
          objectives: Json
          pinned: boolean
          priority: string
          progress: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          name: string
          objectives?: Json
          pinned?: boolean
          priority?: string
          progress?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          name?: string
          objectives?: Json
          pinned?: boolean
          priority?: string
          progress?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_tasks: {
        Row: {
          approval_state: string
          assignee: string | null
          created_at: string
          dependencies: Json
          description: string | null
          due_date: string | null
          id: string
          metadata: Json
          output: string | null
          position: number
          priority: string
          progress: number
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          worker_key: string | null
        }
        Insert: {
          approval_state?: string
          assignee?: string | null
          created_at?: string
          dependencies?: Json
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          output?: string | null
          position?: number
          priority?: string
          progress?: number
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          worker_key?: string | null
        }
        Update: {
          approval_state?: string
          assignee?: string | null
          created_at?: string
          dependencies?: Json
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          output?: string | null
          position?: number
          priority?: string
          progress?: number
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          worker_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "workspace_projects"
            referencedColumns: ["id"]
          },
        ]
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
      is_creator: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin_email: { Args: { _email: string }; Returns: boolean }
      match_creator_knowledge: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          source_id: string
          source_kind: string
          source_title: string
        }[]
      }
      match_egreed_examples: {
        Args: {
          domain_filter?: string
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          context: string
          domain: string
          id: string
          instruction: string
          language: string
          response: string
          similarity: number
          task: string
        }[]
      }
      search_egreed_examples: {
        Args: { domain_filter?: string; match_count?: number; query: string }
        Returns: {
          context: string
          domain: string
          id: string
          instruction: string
          language: string
          rank: number
          response: string
          task: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "creator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "creator", "user"],
    },
  },
} as const

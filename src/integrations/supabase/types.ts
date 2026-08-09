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
      designer_applications: {
        Row: {
          admin_note: string | null
          age_group: string
          categories: string[]
          category: string
          contact: string
          created_at: string
          extra: string | null
          id: string
          intro: string
          portfolio_url: string | null
          samples_paths: string[]
          status: string
          updated_at: string
          user_id: string
          why_join: string
          years_experience: number | null
        }
        Insert: {
          admin_note?: string | null
          age_group: string
          categories?: string[]
          category: string
          contact: string
          created_at?: string
          extra?: string | null
          id?: string
          intro: string
          portfolio_url?: string | null
          samples_paths?: string[]
          status?: string
          updated_at?: string
          user_id: string
          why_join: string
          years_experience?: number | null
        }
        Update: {
          admin_note?: string | null
          age_group?: string
          categories?: string[]
          category?: string
          contact?: string
          created_at?: string
          extra?: string | null
          id?: string
          intro?: string
          portfolio_url?: string | null
          samples_paths?: string[]
          status?: string
          updated_at?: string
          user_id?: string
          why_join?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      designer_slots: {
        Row: {
          total_slots: number
          updated_at: string
          user_id: string
        }
        Insert: {
          total_slots?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          total_slots?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          designer_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          designer_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          designer_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_path: string | null
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      mock_purchases: {
        Row: {
          created_at: string
          id: string
          item_key: string
          item_type: string
          price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          item_type: string
          price: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          item_type?: string
          price?: number
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          attachment_paths: string[]
          budget_max: number | null
          budget_min: number | null
          category: string
          created_at: string
          customer_id: string
          deadline: string | null
          deliverable_path: string | null
          delivered_at: string | null
          designer_id: string
          details: string
          expired: boolean
          id: string
          paid_at: string | null
          price: number
          reference_url: string | null
          status: string
          title: string | null
          updated_at: string
          watermark_path: string | null
        }
        Insert: {
          attachment_paths?: string[]
          budget_max?: number | null
          budget_min?: number | null
          category: string
          created_at?: string
          customer_id: string
          deadline?: string | null
          deliverable_path?: string | null
          delivered_at?: string | null
          designer_id: string
          details: string
          expired?: boolean
          id?: string
          paid_at?: string | null
          price: number
          reference_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          watermark_path?: string | null
        }
        Update: {
          attachment_paths?: string[]
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          created_at?: string
          customer_id?: string
          deadline?: string | null
          deliverable_path?: string | null
          delivered_at?: string | null
          designer_id?: string
          details?: string
          expired?: boolean
          id?: string
          paid_at?: string | null
          price?: number
          reference_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          watermark_path?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allowed_categories: string[]
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          completed_orders: number
          created_at: string
          designer_tag: string | null
          display_name: string | null
          gif_avatar_url: string | null
          id: string
          is_banned: boolean
          membership: string
          orders_placed: number
          total_spent: number
          updated_at: string
          username: string | null
          value_cycles: number
          value_points: number
          years_experience: number | null
        }
        Insert: {
          allowed_categories?: string[]
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          completed_orders?: number
          created_at?: string
          designer_tag?: string | null
          display_name?: string | null
          gif_avatar_url?: string | null
          id: string
          is_banned?: boolean
          membership?: string
          orders_placed?: number
          total_spent?: number
          updated_at?: string
          username?: string | null
          value_cycles?: number
          value_points?: number
          years_experience?: number | null
        }
        Update: {
          allowed_categories?: string[]
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          completed_orders?: number
          created_at?: string
          designer_tag?: string | null
          display_name?: string | null
          gif_avatar_url?: string | null
          id?: string
          is_banned?: boolean
          membership?: string
          orders_placed?: number
          total_spent?: number
          updated_at?: string
          username?: string | null
          value_cycles?: number
          value_points?: number
          years_experience?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          sample_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          sample_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          sample_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "samples"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_likes: {
        Row: {
          created_at: string
          sample_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sample_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          sample_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_likes_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "samples"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          sample_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          sample_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          sample_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_ratings_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "samples"
            referencedColumns: ["id"]
          },
        ]
      }
      samples: {
        Row: {
          attachment_path: string | null
          category: string
          created_at: string
          description: string | null
          designer_id: string
          gallery_paths: string[]
          game_type: string
          id: string
          image_url: string
          likes: number
          media_type: string
          preview_path: string | null
          price: number
          reject_reason: string | null
          server_id: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          attachment_path?: string | null
          category: string
          created_at?: string
          description?: string | null
          designer_id: string
          gallery_paths?: string[]
          game_type?: string
          id?: string
          image_url: string
          likes?: number
          media_type?: string
          preview_path?: string | null
          price: number
          reject_reason?: string | null
          server_id?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          attachment_path?: string | null
          category?: string
          created_at?: string
          description?: string | null
          designer_id?: string
          gallery_paths?: string[]
          game_type?: string
          id?: string
          image_url?: string
          likes?: number
          media_type?: string
          preview_path?: string | null
          price?: number
          reject_reason?: string | null
          server_id?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      sponsor_ads: {
        Row: {
          created_at: string
          destination_url: string
          duration_days: number
          expires_at: string
          id: string
          image_path: string
          price: number
          starts_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_url: string
          duration_days: number
          expires_at: string
          id?: string
          image_path: string
          price: number
          starts_at?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_url?: string
          duration_days?: number
          expires_at?: string
          id?: string
          image_path?: string
          price?: number
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ranks: {
        Row: {
          expires_at: string
          granted_at: string
          granted_by: string | null
          id: string
          rank: string
          user_id: string
        }
        Insert: {
          expires_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          rank: string
          user_id: string
        }
        Update: {
          expires_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          rank?: string
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
    }
    Enums: {
      app_role: "customer" | "designer" | "admin"
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
      app_role: ["customer", "designer", "admin"],
    },
  },
} as const

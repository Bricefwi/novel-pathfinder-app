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
      accommodation_slots: {
        Row: {
          booking_id: string | null
          created_at: string
          date: string
          id: string
          is_available: boolean | null
          name: string
          notes: string | null
          price_per_night: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          date: string
          id?: string
          is_available?: boolean | null
          name?: string
          notes?: string | null
          price_per_night?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          is_available?: boolean | null
          name?: string
          notes?: string | null
          price_per_night?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_slots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          country: string | null
          created_at: string
          description: string | null
          duration: string | null
          exclusions: string[] | null
          featured_image: string | null
          id: string
          images: Json | null
          inclusions: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          itinerary: Json | null
          location: string | null
          max_participants: number | null
          price_from: number | null
          price_to: number | null
          region: string | null
          requirements: string[] | null
          riding_level: Database["public"]["Enums"]["riding_level"] | null
          short_description: string | null
          slug: string
          title: string
          travel_diary: Json | null
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          country?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          exclusions?: string[] | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          inclusions?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          itinerary?: Json | null
          location?: string | null
          max_participants?: number | null
          price_from?: number | null
          price_to?: number | null
          region?: string | null
          requirements?: string[] | null
          riding_level?: Database["public"]["Enums"]["riding_level"] | null
          short_description?: string | null
          slug: string
          title: string
          travel_diary?: Json | null
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          country?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          exclusions?: string[] | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          inclusions?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          itinerary?: Json | null
          location?: string | null
          max_participants?: number | null
          price_from?: number | null
          price_to?: number | null
          region?: string | null
          requirements?: string[] | null
          riding_level?: Database["public"]["Enums"]["riding_level"] | null
          short_description?: string | null
          slug?: string
          title?: string
          travel_diary?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      activity_slots: {
        Row: {
          activity_id: string | null
          created_at: string
          current_participants: number | null
          end_date: string
          id: string
          is_available: boolean | null
          max_participants: number | null
          notes: string | null
          price: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          current_participants?: number | null
          end_date: string
          id?: string
          is_available?: boolean | null
          max_participants?: number | null
          notes?: string | null
          price?: number | null
          start_date: string
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          current_participants?: number | null
          end_date?: string
          id?: string
          is_available?: boolean | null
          max_participants?: number | null
          notes?: string | null
          price?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_slots_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_subscriptions: {
        Row: {
          activity_id: string | null
          activity_slot_id: string | null
          id: string
          status: string | null
          subscribed_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          activity_slot_id?: string | null
          id?: string
          status?: string | null
          subscribed_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          activity_slot_id?: string | null
          id?: string
          status?: string | null
          subscribed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_subscriptions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_subscriptions_activity_slot_id_fkey"
            columns: ["activity_slot_id"]
            isOneToOne: false
            referencedRelation: "activity_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      airbnb_reviews: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          rating: number
          review_date: string
          reviewer_name: string
          reviewer_years: string | null
          sort_order: number | null
          stay_type: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rating?: number
          review_date: string
          reviewer_name: string
          reviewer_years?: string | null
          sort_order?: number | null
          stay_type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rating?: number
          review_date?: string
          reviewer_name?: string
          reviewer_years?: string | null
          sort_order?: number | null
          stay_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      apology_email_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_length: number
          metadata: Json | null
          performed_by: string | null
          performed_by_email: string | null
          recipient: string
          sender_name: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_length?: number
          metadata?: Json | null
          performed_by?: string | null
          performed_by_email?: string | null
          recipient: string
          sender_name?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_length?: number
          metadata?: Json | null
          performed_by?: string | null
          performed_by_email?: string | null
          recipient?: string
          sender_name?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          images: Json | null
          is_published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      audit_reports: {
        Row: {
          audit_type: string
          created_at: string
          created_by: string | null
          findings: Json | null
          global_score: number | null
          id: string
          model_used: string | null
          raw_response: string | null
          recommendations: Json | null
          scores: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          audit_type?: string
          created_at?: string
          created_by?: string | null
          findings?: Json | null
          global_score?: number | null
          id?: string
          model_used?: string | null
          raw_response?: string | null
          recommendations?: Json | null
          scores?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          audit_type?: string
          created_at?: string
          created_by?: string | null
          findings?: Json | null
          global_score?: number | null
          id?: string
          model_used?: string | null
          raw_response?: string | null
          recommendations?: Json | null
          scores?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          activity_id: string | null
          booking_number: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          participants: number | null
          start_date: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activity_id?: string | null
          booking_number?: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          participants?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activity_id?: string | null
          booking_number?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          participants?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          activity_type: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      consistency_check_runs: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          divergences: Json
          divergences_count: number
          id: string
          run_at: string
          total_checks: number
          totals: Json
          triggered_by: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          divergences?: Json
          divergences_count?: number
          id?: string
          run_at?: string
          total_checks?: number
          totals?: Json
          triggered_by?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          divergences?: Json
          divergences_count?: number
          id?: string
          run_at?: string
          total_checks?: number
          totals?: Json
          triggered_by?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          activity_id: string | null
          created_at: string
          email: string
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          message: string
          name: string
          participants: number | null
          phone: string | null
          preferred_date: string | null
          subject: string | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message: string
          name: string
          participants?: number | null
          phone?: string | null
          preferred_date?: string | null
          subject?: string | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message?: string
          name?: string
          participants?: number | null
          phone?: string | null
          preferred_date?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_articles: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          distance_from_arwen: string | null
          excerpt: string | null
          featured_image: string | null
          featured_image_override: string | null
          id: string
          images: string[] | null
          images_override: string[] | null
          is_published: boolean | null
          location_address: string | null
          location_coordinates: Json | null
          location_email: string | null
          location_name: string | null
          location_phone: string | null
          location_website: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          distance_from_arwen?: string | null
          excerpt?: string | null
          featured_image?: string | null
          featured_image_override?: string | null
          id?: string
          images?: string[] | null
          images_override?: string[] | null
          is_published?: boolean | null
          location_address?: string | null
          location_coordinates?: Json | null
          location_email?: string | null
          location_name?: string | null
          location_phone?: string | null
          location_website?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          distance_from_arwen?: string | null
          excerpt?: string | null
          featured_image?: string | null
          featured_image_override?: string | null
          id?: string
          images?: string[] | null
          images_override?: string[] | null
          is_published?: boolean | null
          location_address?: string | null
          location_coordinates?: Json | null
          location_email?: string | null
          location_name?: string | null
          location_phone?: string | null
          location_website?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      ecosystem_suggestions: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          description: string
          generated_article_id: string | null
          id: string
          location_address: string | null
          location_name: string
          location_website: string | null
          reviewed_at: string | null
          status: string
          suggester_email: string
          suggester_name: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          description: string
          generated_article_id?: string | null
          id?: string
          location_address?: string | null
          location_name: string
          location_website?: string | null
          reviewed_at?: string | null
          status?: string
          suggester_email: string
          suggester_name: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string
          generated_article_id?: string | null
          id?: string
          location_address?: string | null
          location_name?: string
          location_website?: string | null
          reviewed_at?: string | null
          status?: string
          suggester_email?: string
          suggester_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_suggestions_generated_article_id_fkey"
            columns: ["generated_article_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      efacture_events: {
        Row: {
          created_at: string
          direction: string
          error_message: string | null
          event_type: string
          id: string
          inbound_invoice_id: string | null
          invoice_id: string | null
          pa_event_id: string | null
          pa_provider: string | null
          payload: Json | null
          quote_id: string | null
          status_value: string | null
        }
        Insert: {
          created_at?: string
          direction: string
          error_message?: string | null
          event_type: string
          id?: string
          inbound_invoice_id?: string | null
          invoice_id?: string | null
          pa_event_id?: string | null
          pa_provider?: string | null
          payload?: Json | null
          quote_id?: string | null
          status_value?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          error_message?: string | null
          event_type?: string
          id?: string
          inbound_invoice_id?: string | null
          invoice_id?: string | null
          pa_event_id?: string | null
          pa_provider?: string | null
          payload?: Json | null
          quote_id?: string | null
          status_value?: string | null
        }
        Relationships: []
      }
      email_audit_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          recipient: string
          reference_id: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient: string
          reference_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient?: string
          reference_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          activity_id: string | null
          article_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          article_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          article_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          is_featured: boolean | null
          media_type: string
          sort_order: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          is_featured?: boolean | null
          media_type?: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          media_type?: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      inbound_invoices: {
        Row: {
          created_at: string
          currency: string
          due_date: string | null
          format: string
          id: string
          invoice_date: string | null
          invoice_number: string
          notes: string | null
          pa_id: string | null
          pdf_url: string | null
          raw_metadata: Json | null
          received_via: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          supplier_email: string | null
          supplier_name: string
          supplier_siren: string | null
          supplier_vat_number: string | null
          total_ht: number | null
          total_ttc: number
          total_tva: number | null
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          due_date?: string | null
          format?: string
          id?: string
          invoice_date?: string | null
          invoice_number: string
          notes?: string | null
          pa_id?: string | null
          pdf_url?: string | null
          raw_metadata?: Json | null
          received_via?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supplier_email?: string | null
          supplier_name: string
          supplier_siren?: string | null
          supplier_vat_number?: string | null
          total_ht?: number | null
          total_ttc: number
          total_tva?: number | null
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          due_date?: string | null
          format?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          notes?: string | null
          pa_id?: string | null
          pdf_url?: string | null
          raw_metadata?: Json | null
          received_via?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supplier_email?: string | null
          supplier_name?: string
          supplier_siren?: string | null
          supplier_vat_number?: string | null
          total_ht?: number | null
          total_ttc?: number
          total_tva?: number | null
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          activity_duration: string | null
          activity_title: string
          amount_paid: number | null
          cgu_accepted: boolean | null
          cgu_accepted_at: string | null
          cgv_accepted: boolean | null
          cgv_accepted_at: string | null
          client_address: string | null
          client_company_name: string | null
          client_email: string
          client_name: string
          client_phone: string | null
          client_signature: string | null
          client_siren: string | null
          client_type: string
          client_validated: boolean | null
          client_validated_at: string | null
          client_vat_number: string | null
          created_at: string
          delivery_address: string | null
          due_date: string | null
          efacture_pa_id: string | null
          efacture_pdf_url: string | null
          efacture_status: string | null
          efacture_submitted_at: string | null
          efacture_xml_url: string | null
          end_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          operation_nature: string
          participants: number
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          quote_id: string | null
          start_date: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          unit_price: number
          updated_at: string
          user_id: string | null
          vat_on_debit_option: boolean
        }
        Insert: {
          activity_duration?: string | null
          activity_title: string
          amount_paid?: number | null
          cgu_accepted?: boolean | null
          cgu_accepted_at?: string | null
          cgv_accepted?: boolean | null
          cgv_accepted_at?: string | null
          client_address?: string | null
          client_company_name?: string | null
          client_email: string
          client_name: string
          client_phone?: string | null
          client_signature?: string | null
          client_siren?: string | null
          client_type?: string
          client_validated?: boolean | null
          client_validated_at?: string | null
          client_vat_number?: string | null
          created_at?: string
          delivery_address?: string | null
          due_date?: string | null
          efacture_pa_id?: string | null
          efacture_pdf_url?: string | null
          efacture_status?: string | null
          efacture_submitted_at?: string | null
          efacture_xml_url?: string | null
          end_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          operation_nature?: string
          participants?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          quote_id?: string | null
          start_date?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          user_id?: string | null
          vat_on_debit_option?: boolean
        }
        Update: {
          activity_duration?: string | null
          activity_title?: string
          amount_paid?: number | null
          cgu_accepted?: boolean | null
          cgu_accepted_at?: string | null
          cgv_accepted?: boolean | null
          cgv_accepted_at?: string | null
          client_address?: string | null
          client_company_name?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          client_signature?: string | null
          client_siren?: string | null
          client_type?: string
          client_validated?: boolean | null
          client_validated_at?: string | null
          client_vat_number?: string | null
          created_at?: string
          delivery_address?: string | null
          due_date?: string | null
          efacture_pa_id?: string | null
          efacture_pdf_url?: string | null
          efacture_status?: string | null
          efacture_submitted_at?: string | null
          efacture_xml_url?: string | null
          end_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          operation_nature?: string
          participants?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          quote_id?: string | null
          start_date?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          user_id?: string | null
          vat_on_debit_option?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          acceptance_context: string | null
          activity_id: string | null
          cgu_accepted: boolean
          cgu_accepted_at: string | null
          cgu_document_hash: string | null
          cgu_url: string | null
          cgu_version: string
          cgv_accepted: boolean
          cgv_accepted_at: string | null
          cgv_document_hash: string | null
          cgv_url: string | null
          cgv_version: string
          client_email: string
          client_ip: string | null
          client_name: string
          created_at: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          quote_id: string | null
          signature_data: string | null
          signature_type: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          acceptance_context?: string | null
          activity_id?: string | null
          cgu_accepted?: boolean
          cgu_accepted_at?: string | null
          cgu_document_hash?: string | null
          cgu_url?: string | null
          cgu_version?: string
          cgv_accepted?: boolean
          cgv_accepted_at?: string | null
          cgv_document_hash?: string | null
          cgv_url?: string | null
          cgv_version?: string
          client_email: string
          client_ip?: string | null
          client_name: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          quote_id?: string | null
          signature_data?: string | null
          signature_type?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          acceptance_context?: string | null
          activity_id?: string | null
          cgu_accepted?: boolean
          cgu_accepted_at?: string | null
          cgu_document_hash?: string | null
          cgu_url?: string | null
          cgu_version?: string
          cgv_accepted?: boolean
          cgv_accepted_at?: string | null
          cgv_document_hash?: string | null
          cgv_url?: string | null
          cgv_version?: string
          client_email?: string
          client_ip?: string | null
          client_name?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          quote_id?: string | null
          signature_data?: string | null
          signature_type?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          source: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_link_audit: {
        Row: {
          action: string
          amount_match: boolean | null
          client_email: string | null
          client_name: string | null
          created_at: string
          error_message: string | null
          expected_amount: number | null
          id: string
          installment_number: number | null
          invoice_id: string | null
          ip_address: string | null
          metadata: Json | null
          payment_link_url: string | null
          payment_option: string
          performed_by: string | null
          performed_by_email: string | null
          quote_id: string | null
          requested_amount: number | null
          source: string | null
          status: string
          stripe_session_id: string | null
          total_installments: number | null
          user_agent: string | null
        }
        Insert: {
          action: string
          amount_match?: boolean | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          error_message?: string | null
          expected_amount?: number | null
          id?: string
          installment_number?: number | null
          invoice_id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          payment_link_url?: string | null
          payment_option: string
          performed_by?: string | null
          performed_by_email?: string | null
          quote_id?: string | null
          requested_amount?: number | null
          source?: string | null
          status: string
          stripe_session_id?: string | null
          total_installments?: number | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          amount_match?: boolean | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          error_message?: string | null
          expected_amount?: number | null
          id?: string
          installment_number?: number | null
          invoice_id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          payment_link_url?: string | null
          payment_option?: string
          performed_by?: string | null
          performed_by_email?: string | null
          quote_id?: string | null
          requested_amount?: number | null
          source?: string | null
          status?: string
          stripe_session_id?: string | null
          total_installments?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      payment_schedules: {
        Row: {
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          expected_amount: number
          id: string
          installment_number: number
          invoice_id: string | null
          link_sent_at: string | null
          notes: string | null
          paid_at: string | null
          payment_link_url: string | null
          percentage: number | null
          quote_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_installments: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          expected_amount: number
          id?: string
          installment_number: number
          invoice_id?: string | null
          link_sent_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_link_url?: string | null
          percentage?: number | null
          quote_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_installments?: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          expected_amount?: number
          id?: string
          installment_number?: number
          invoice_id?: string | null
          link_sent_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_link_url?: string | null
          percentage?: number | null
          quote_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_installments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_email: string | null
          client_name: string | null
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          payment_type: string
          quote_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payment_type?: string
          quote_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payment_type?: string
          quote_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          budget_range: string | null
          city: string | null
          country: string | null
          created_at: string
          dream_destinations: string[] | null
          equipment_details: string | null
          first_name: string | null
          has_own_equipment: boolean | null
          health_info: string | null
          height_cm: number | null
          id: string
          interests: string[] | null
          last_name: string | null
          newsletter_subscribed: boolean | null
          onboarding_completed: boolean | null
          past_experiences: string | null
          phone: string | null
          postal_code: string | null
          preferences: Json | null
          preferred_duration: string | null
          preferred_periods: string[] | null
          preferred_trip_types: string[] | null
          riding_experience_years: number | null
          riding_level: Database["public"]["Enums"]["riding_level"] | null
          riding_style: string[] | null
          travel_companions: string | null
          travel_dreams: string | null
          travel_preferences: string[] | null
          travel_style: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          budget_range?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dream_destinations?: string[] | null
          equipment_details?: string | null
          first_name?: string | null
          has_own_equipment?: boolean | null
          health_info?: string | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          last_name?: string | null
          newsletter_subscribed?: boolean | null
          onboarding_completed?: boolean | null
          past_experiences?: string | null
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          preferred_duration?: string | null
          preferred_periods?: string[] | null
          preferred_trip_types?: string[] | null
          riding_experience_years?: number | null
          riding_level?: Database["public"]["Enums"]["riding_level"] | null
          riding_style?: string[] | null
          travel_companions?: string | null
          travel_dreams?: string | null
          travel_preferences?: string[] | null
          travel_style?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          budget_range?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dream_destinations?: string[] | null
          equipment_details?: string | null
          first_name?: string | null
          has_own_equipment?: boolean | null
          health_info?: string | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          last_name?: string | null
          newsletter_subscribed?: boolean | null
          onboarding_completed?: boolean | null
          past_experiences?: string | null
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          preferred_duration?: string | null
          preferred_periods?: string[] | null
          preferred_trip_types?: string[] | null
          riding_experience_years?: number | null
          riding_level?: Database["public"]["Enums"]["riding_level"] | null
          riding_style?: string[] | null
          travel_companions?: string | null
          travel_dreams?: string | null
          travel_preferences?: string[] | null
          travel_style?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      prospect_analyses: {
        Row: {
          analyse_resume: string | null
          budget_probable: string | null
          confiance: string | null
          created_at: string
          events_analyzed: number | null
          id: string
          intention_principale: string | null
          produits_suggeres: Json | null
          raw_response: Json | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          analyse_resume?: string | null
          budget_probable?: string | null
          confiance?: string | null
          created_at?: string
          events_analyzed?: number | null
          id?: string
          intention_principale?: string | null
          produits_suggeres?: Json | null
          raw_response?: Json | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          analyse_resume?: string | null
          budget_probable?: string | null
          confiance?: string | null
          created_at?: string
          events_analyzed?: number | null
          id?: string
          intention_principale?: string | null
          produits_suggeres?: Json | null
          raw_response?: Json | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quote_cancellation_log: {
        Row: {
          cancelled_by: string | null
          cancelled_by_email: string | null
          client_email: string
          client_name: string | null
          created_at: string
          email_error: string | null
          email_sent: boolean | null
          id: string
          metadata: Json | null
          quote_id: string
          quote_number: string
          reason: string | null
        }
        Insert: {
          cancelled_by?: string | null
          cancelled_by_email?: string | null
          client_email: string
          client_name?: string | null
          created_at?: string
          email_error?: string | null
          email_sent?: boolean | null
          id?: string
          metadata?: Json | null
          quote_id: string
          quote_number: string
          reason?: string | null
        }
        Update: {
          cancelled_by?: string | null
          cancelled_by_email?: string | null
          client_email?: string
          client_name?: string | null
          created_at?: string
          email_error?: string | null
          email_sent?: boolean | null
          id?: string
          metadata?: Json | null
          quote_id?: string
          quote_number?: string
          reason?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          activity_duration: string | null
          activity_id: string | null
          activity_title: string
          cancellation_email_sent: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cgu_accepted: boolean | null
          cgu_accepted_at: string | null
          cgv_accepted: boolean | null
          cgv_accepted_at: string | null
          client_address: string | null
          client_company_name: string | null
          client_email: string
          client_name: string
          client_phone: string | null
          client_siren: string | null
          client_type: string
          client_vat_number: string | null
          created_at: string
          delivery_address: string | null
          deposit_amount: number | null
          deposit_percentage: number | null
          efacture_pa_id: string | null
          efacture_status: string | null
          efacture_submitted_at: string | null
          efacture_xml_url: string | null
          end_date: string | null
          id: string
          notes: string | null
          operation_nature: string
          participants: number
          payment_option: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          quote_number: string
          start_date: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_price: number
          unit_price: number
          updated_at: string
          user_id: string | null
          valid_until: string | null
          validation_notification_sent: boolean | null
          vat_on_debit_option: boolean
        }
        Insert: {
          activity_duration?: string | null
          activity_id?: string | null
          activity_title: string
          cancellation_email_sent?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cgu_accepted?: boolean | null
          cgu_accepted_at?: string | null
          cgv_accepted?: boolean | null
          cgv_accepted_at?: string | null
          client_address?: string | null
          client_company_name?: string | null
          client_email: string
          client_name: string
          client_phone?: string | null
          client_siren?: string | null
          client_type?: string
          client_vat_number?: string | null
          created_at?: string
          delivery_address?: string | null
          deposit_amount?: number | null
          deposit_percentage?: number | null
          efacture_pa_id?: string | null
          efacture_status?: string | null
          efacture_submitted_at?: string | null
          efacture_xml_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          operation_nature?: string
          participants?: number
          payment_option?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          quote_number: string
          start_date?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
          user_id?: string | null
          valid_until?: string | null
          validation_notification_sent?: boolean | null
          vat_on_debit_option?: boolean
        }
        Update: {
          activity_duration?: string | null
          activity_id?: string | null
          activity_title?: string
          cancellation_email_sent?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cgu_accepted?: boolean | null
          cgu_accepted_at?: string | null
          cgv_accepted?: boolean | null
          cgv_accepted_at?: string | null
          client_address?: string | null
          client_company_name?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          client_siren?: string | null
          client_type?: string
          client_vat_number?: string | null
          created_at?: string
          delivery_address?: string | null
          deposit_amount?: number | null
          deposit_percentage?: number | null
          efacture_pa_id?: string | null
          efacture_status?: string | null
          efacture_submitted_at?: string | null
          efacture_xml_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          operation_nature?: string
          participants?: number
          payment_option?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          quote_number?: string
          start_date?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
          user_id?: string | null
          valid_until?: string | null
          validation_notification_sent?: boolean | null
          vat_on_debit_option?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          performed_by: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      seo_cache: {
        Row: {
          content: string
          content_type: string
          created_at: string
          expires_at: string
          id: string
          updated_at: string
        }
        Insert: {
          content: string
          content_type?: string
          created_at?: string
          expires_at: string
          id: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          activity_id: string | null
          author_avatar: string | null
          author_location: string | null
          author_name: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          rating: number | null
        }
        Insert: {
          activity_id?: string | null
          author_avatar?: string | null
          author_location?: string | null
          author_name: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          rating?: number | null
        }
        Update: {
          activity_id?: string | null
          author_avatar?: string | null
          author_location?: string | null
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reviews: {
        Row: {
          activity_id: string | null
          content: string
          created_at: string
          id: string
          is_approved: boolean | null
          photo_urls: string[] | null
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          photo_urls?: string[] | null
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          photo_urls?: string[] | null
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reviews_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      client_activity_timeline: {
        Row: {
          amount: number | null
          date: string | null
          event_type: string | null
          id: string | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_seo_cache: { Args: never; Returns: undefined }
      generate_booking_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_quote_number: { Args: never; Returns: string }
      get_config: { Args: { config_key: string }; Returns: Json }
      get_user_emails_for_profiles: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_participated_in_room: {
        Args: { _activity_type: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_type: "randonnee" | "cours" | "stage" | "sejour" | "hebergement"
      app_role: "admin" | "user"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      riding_level: "debutant" | "intermediaire" | "confirme" | "expert"
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
      activity_type: ["randonnee", "cours", "stage", "sejour", "hebergement"],
      app_role: ["admin", "user"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      riding_level: ["debutant", "intermediaire", "confirme", "expert"],
    },
  },
} as const

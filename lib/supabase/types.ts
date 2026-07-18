export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AuditInsert<T> = Omit<T, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> & {
  id?: string;
  created_by?: string | null;
  updated_by?: string | null;
};


export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          code: string;
          logo_url: string | null;
          plan: 'starter' | 'professional' | 'enterprise';
          status: 'active' | 'suspended' | 'trial';
          owner_name: string;
          owner_email: string;
          phone: string | null;
          address: string | null;
          total_users: number;
          total_properties: number;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
          jwt_duration: number | null;
          theme_color: string | null;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          company_id: string;
          plan: 'starter' | 'professional' | 'enterprise';
          status: 'active' | 'expired' | 'cancelled' | 'trial';
          seats: number;
          price_per_month: number;
          starts_at: string;
          ends_at: string | null;
          trial_ends_at: string | null;
          cancelled_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string | null;
          email: string | null;
          password_hash: string | null;
          phone: string | null;
          role: 'super_admin' | 'company_admin' | 'manager' | 'sales_agent' | 'landlord';
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          landlord_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string;
          phone: string;
          email: string | null;
          source: 'website' | 'facebook' | 'tiktok' | 'zalo' | 'chotot' | 'referral' | 'cold_call' | 'walk_in' | 'other';
          status: 'new' | 'consulting' | 'appointment' | 'viewed' | 'deposited' | 'rented' | 'cancelled' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost';
          interest: string | null;
          budget: number;
          preferred_area: string | null;
          preferred_room_type: string | null;
          interested_area: string | null;
          assigned_to: string | null;
          notes: string | null;
          last_contacted_at: string | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
          converted_to_contract_id?: string | null;
          converted_at?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
        Relationships: [];
      };
      lead_activities: {
        Row: {
          id: string;
          lead_id: string;
          company_id: string | null;
          type: 'call' | 'meeting' | 'zalo' | 'email' | 'note' | 'status_change';
          content: string;
          old_status: string | null;
          new_status: string | null;
          created_by: string | null;
          created_by_name: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['lead_activities']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['lead_activities']['Insert']>;
        Relationships: [];
      };
      consultations: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string;
          phone: string;
          email: string | null;
          message: string;
          property_id: string | null;
          property_title: string | null;
          status: 'new' | 'in_progress' | 'resolved' | 'closed';
          assigned_to: string | null;
          assigned_to_name: string | null;
          source: 'website' | 'phone' | 'email' | 'walk_in';
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['consultations']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['consultations']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          company_id: string | null;
          title: string;
          body: string;
          type: 'new_lead' | 'new_appointment' | 'contract_expiring' | 'new_landlord' | 'lead' | 'appointment' | 'contract' | 'system' | 'consultation';
          is_read: boolean;
          recipient_id: string | null;
          link: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          user_name: string;
          action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
          entity: string;
          entity_id: string;
          entity_label: string;
          detail: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          description: string | null;
          permissions: string[];
          is_system: boolean;
          users_count: number;
          created_at: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['roles']['Insert']>;
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          module: string;
          action: 'view' | 'create' | 'edit' | 'delete' | 'manage';
          description: string | null;
        };
        Insert: Omit<Database['public']['Tables']['permissions']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['permissions']['Insert']>;
        Relationships: [];
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string;
          permission_id: string;
        };
        Insert: Omit<Database['public']['Tables']['role_permissions']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['role_permissions']['Insert']>;
        Relationships: [];
      };
      employee_kpis: {
        Row: {
          id: string;
          company_id: string | null;
          employee_id: string | null;
          employee_name: string;
          period: string;
          total_leads: number;
          total_appointments: number;
          successful_deals: number;
          conversion_rate: number;
          revenue_generated: number;
          target_revenue: number;
          score: number;
          status: 'on_track' | 'behind' | 'exceeded';
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
          auto_calculated?: boolean;
          commission_earned?: number;
        };
        Insert: Omit<Database['public']['Tables']['employee_kpis']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['employee_kpis']['Insert']>;
        Relationships: [];
      };
      kpi_configurations: {
        Row: {
          id: string;
          company_id: string;
          revenue_weight: number;
          appointment_weight: number;
          lead_weight: number;
          default_target_revenue: number;
          default_target_appointments: number;
          default_target_leads: number;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['kpi_configurations']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['kpi_configurations']['Insert']>;
        Relationships: [];
      };
      buildings: {
        Row: {
          id: string;
          company_id: string | null;
          code: string;
          name: string;
          area: string;
          address: string | null;
          year_built: number | null;
          total_floors: number;
          total_rooms: number;
          description: string | null;
          image_url: string | null;
          thumbnail_url: string | null;
          landlord_id: string | null;
          manager_ids?: string[] | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
          has_elevator: boolean;
          pccc_certified: boolean;
          common_drying_area: string | null;
          allow_pet: boolean;
          allow_foreigners: boolean;
          allow_vinfast_electric: boolean;
          has_air_conditioner: boolean;
          has_water_heater: boolean;
          has_bed: boolean;
          has_wardrobe: boolean;
          has_kitchen_cabinet: boolean;
          has_refrigerator: boolean;
          has_hood: boolean;
          has_dressing_table: boolean;
          electricity_price: number;
          water_price: number;
          internet_price: number;
          common_service_price: number;
          common_service_description: string | null;
          fingerprint_lock_desc: string | null;
          extra_occupant_fee: number;
          has_car_parking: boolean;
          washing_machine_type: string;
          dryer_type: string;
          electric_vehicle_fee: number;
          management_fee_rate?: number;
          latitude?: number | null;
          longitude?: number | null;
        };
        Insert: Omit<Database['public']['Tables']['buildings']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          manager_ids?: string[] | null;
          has_elevator?: boolean;
          pccc_certified?: boolean;
          common_drying_area?: string | null;
          allow_pet?: boolean;
          allow_foreigners?: boolean;
          allow_vinfast_electric?: boolean;
          latitude?: number | null;
          longitude?: number | null;
        };
        Update: Partial<Database['public']['Tables']['buildings']['Insert']>;
        Relationships: [];
      };
      landlords: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          code?: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          properties_count: number;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
          image_url: string | null;
        };
        Insert: Omit<Database['public']['Tables']['landlords']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          code?: string | null;
          image_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['landlords']['Insert']>;
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          company_id: string | null;
          building_id: string | null;
          landlord_id: string | null;
          code: string;
          floor: number;
          room_type: string | null;
          size: number | null;
          price: number;
          status: 'available' | 'rented' | 'maintenance' | 'reserved';
          bedrooms: number;
          bathrooms: number;
          description: string | null;
          rose: string | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
          reserved_until?: string | null;
          reserved_by_profile_id?: string | null;
          has_private_balcony: boolean;
          max_occupants: number;
          max_vehicles_per_room: number;
          min_contract_months: number;
        };
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          landlord_id?: string | null;
          has_private_balcony?: boolean;
          max_occupants?: number;
          max_vehicles_per_room?: number;
          min_contract_months?: number;
        };
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
        Relationships: [];
      };
      building_services: {
        Row: {
          id: string;
          building_id: string;
          service_name: string;
          price: number;
          unit: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['building_services']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['building_services']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "building_services_building_id_fkey";
            columns: ["building_id"];
            isOneToOne: false;
            referencedRelation: "buildings";
            referencedColumns: ["id"];
          }
        ];
      };
      room_images: {
        Row: {
          id: string;
          company_id: string | null;
          room_id: string;
          url: string;
          thumbnail_url: string | null;
          is_thumbnail: boolean;
          priority: number;
          media_type: string;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['room_images']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string; is_thumbnail?: boolean; priority?: number; media_type?: string };
        Update: Partial<Database['public']['Tables']['room_images']['Insert']>;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          company_id: string | null;
          customer_name: string;
          customer_phone: string | null;
          customer_email: string | null;
          room_id: string | null;
          room_title: string | null;
          date: string;
          time: string;
          area: string | null;
          status: 'Pending' | 'Confirm' | 'Viewed' | 'Dealed' | 'Cancel' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
          notes: string | null;
          assigned_to: string | null;
          assigned_to_name: string | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
          landlord_code?: string | null;
          landlord_name?: string | null;
          landlord_id?: string | null;
          building_id?: string | null;
          building_address?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
        Relationships: [];
      };
      contract_templates: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          type: string;
          content: string | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['contract_templates']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['contract_templates']['Insert']>;
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          department: string | null;
          position: string | null;
          join_date: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
        Relationships: [];
      };
      deposit_contracts: {
        Row: {
          id: string;
          company_id: string;
          room_id: string | null;
          contract_code: string;
          status: 'draft' | 'active' | 'signed' | 'converted' | 'cancelled' | 'forfeited' | 'refunded';
          agreement_date: string;
          sign_location: string | null;
          party_a_name: string;
          party_a_dob: string | null;
          party_a_address: string | null;
          party_a_id_card: string | null;
          party_a_id_date: string | null;
          party_a_id_place: string | null;
          party_a_phone: string | null;
          party_b_name: string;
          party_b_phone: string;
          party_b_dob: string | null;
          party_b_id_card: string | null;
          party_b_id_date: string | null;
          party_b_id_place: string | null;
          party_b_address: string | null;
          rent_price: number;
          electricity_price: number;
          water_price: string;
          service_price: string;
          other_services: Json;
          tenant_count: number;
          payment_method: string | null;
          lease_duration_months: number;
          termination_notice_days: number;
          room_repair_support_date: string | null;
          deposit_amount: number;
          deadline_sign_contract: string;
          deposit_payment_type: 'cash' | 'transfer' | 'both';
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_owner: string | null;
          transfer_content_template: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
          commission_rate_raw?: string | null;
          commission_amount?: number;
          sales_agent_id?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['deposit_contracts']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['deposit_contracts']['Insert']>;
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          room_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['favorites']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>;
        Relationships: [];
      };
      tenant_invitations: {
        Row: {
          id: string;
          email: string;
          company_id: string;
          profile_id: string;
          token_hash: string;
          expires_at: string;
          used_at?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenant_invitations']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['tenant_invitations']['Insert']>;
        Relationships: [];
      };
      rental_contracts: {
        Row: {
          id: string;
          company_id: string;
          room_id: string | null;
          deposit_contract_id: string | null;
          contract_code: string;
          status: 'draft' | 'active' | 'ended' | 'terminated' | 'cancelled';
          agreement_date: string;
          start_date: string;
          end_date: string;
          billing_cycle_months: number;
          payment_day_of_month: number;
          handover_date: string | null;
          party_a_name: string;
          party_a_dob: string | null;
          party_a_address: string | null;
          party_a_id_card: string | null;
          party_a_id_date: string | null;
          party_a_id_place: string | null;
          party_a_phone: string | null;
          party_b_name: string;
          party_b_phone: string;
          party_b_dob: string | null;
          party_b_id_card: string | null;
          party_b_id_date: string | null;
          party_b_id_place: string | null;
          party_b_address: string | null;
          rent_price: number;
          electricity_price: number;
          water_price: string;
          service_price: string;
          other_services: Json;
          tenant_count: number;
          payment_method: string | null;
          deposit_amount: number;
          note: string | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
          commission_rate_raw?: string | null;
          commission_amount?: number;
          sales_agent_id?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['rental_contracts']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['rental_contracts']['Insert']>;
        Relationships: [];
      };
      service_readings: {
        Row: {
          id: string;
          company_id: string;
          room_id: string;
          reading_date: string;
          period: string;
          electricity_old: number;
          electricity_new: number;
          water_old: number;
          water_new: number;
          note: string | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['service_readings']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['service_readings']['Insert']>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          room_id: string | null;
          rental_contract_id: string | null;
          invoice_code: string;
          period: string;
          issue_date: string;
          due_date: string;
          status: 'unpaid' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
          rent_amount: number;
          electricity_usage: number;
          electricity_amount: number;
          water_amount: number;
          service_amount: number;
          other_amount: number;
          other_details: string | null;
          total_amount: number;
          management_fee_rate?: number | null;
          management_fee_amount?: number;
          landlord_payout_amount?: number;
          payment_date: string | null;
          payment_method: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
        Relationships: [];
      };

      kpis: {
        Row: {
          id: string;
          company_id: string | null;
          employee_id: string | null;
          employee_name: string;
          period: string;
          leads_assigned: number;
          leads_converted: number;
          appointments_completed: number;
          contracts_signed: number;
          revenue_generated: number;
          target_revenue: number;
          score: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['kpis']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['kpis']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      lead_status: 'new' | 'consulting' | 'appointment' | 'viewed' | 'deposited' | 'rented' | 'cancelled';
      lead_source: 'website' | 'facebook' | 'tiktok' | 'zalo' | 'chotot' | 'referral';
      user_role: 'super_admin' | 'company_admin' | 'manager' | 'sales_agent' | 'landlord';
    };
  };
}

// ─── Convenience aliases ──────────────────────────────────────────────────────
export type DBCompany = Database['public']['Tables']['companies']['Row'];
export type DBSubscription = Database['public']['Tables']['subscriptions']['Row'];
export type DBLead = Database['public']['Tables']['leads']['Row'];
export type DBLeadActivity = Database['public']['Tables']['lead_activities']['Row'];
export type DBConsultation = Database['public']['Tables']['consultations']['Row'];
export type DBNotification = Database['public']['Tables']['notifications']['Row'];
export type DBActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type DBRole = Database['public']['Tables']['roles']['Row'];
export type DBEmployeeKPI = Database['public']['Tables']['employee_kpis']['Row'];
export type DBBuilding = Database['public']['Tables']['buildings']['Row'];
export type DBLandlord = Database['public']['Tables']['landlords']['Row'];
export type DBRoom = Database['public']['Tables']['rooms']['Row'];
export type DBAppointment = Database['public']['Tables']['appointments']['Row'];
export type DBContractTemplate = Database['public']['Tables']['contract_templates']['Row'];
export type DBEmployee = Database['public']['Tables']['employees']['Row'];
export type DBDepositContract = Database['public']['Tables']['deposit_contracts']['Row'];
export type DBFavorite = Database['public']['Tables']['favorites']['Row'];
export type DBTenantInvitation = Database['public']['Tables']['tenant_invitations']['Row'];
export type DBRentalContract = Database['public']['Tables']['rental_contracts']['Row'];
export type DBServiceReading = Database['public']['Tables']['service_readings']['Row'];
export type DBInvoice = Database['public']['Tables']['invoices']['Row'];
export type DBRoomImage = Database['public']['Tables']['room_images']['Row'];

export type DBKPI = Database['public']['Tables']['kpis']['Row'];
export type DBBuildingService = Database['public']['Tables']['building_services']['Row'];
export type DBKPIConfiguration = Database['public']['Tables']['kpi_configurations']['Row'];

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          cancel_reason: string | null
          clinician_id: string | null
          created_at: string
          created_by: string | null
          id: string
          patient_id: string
          reason: string | null
          scheduled_at: string
          service_key: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cancel_reason?: string | null
          clinician_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id: string
          reason?: string | null
          scheduled_at: string
          service_key: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cancel_reason?: string | null
          clinician_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string
          reason?: string | null
          scheduled_at?: string
          service_key?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_key_fkey"
            columns: ["service_key"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_at: string
          diff: Json | null
          id: number
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          diff?: Json | null
          id?: number
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          diff?: Json | null
          id?: number
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      billing_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          kind: string
          payment_id: string | null
          reason: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          kind: string
          payment_id?: string | null
          reason: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          kind?: string
          payment_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "billing_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_adjustments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_settings: {
        Row: {
          approval_note: string | null
          currency: string
          enabled: boolean
          id: number
          price_list_approved: boolean
          price_list_approved_at: string | null
          price_list_approved_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_note?: string | null
          currency?: string
          enabled?: boolean
          id?: number
          price_list_approved?: boolean
          price_list_approved_at?: string | null
          price_list_approved_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_note?: string | null
          currency?: string
          enabled?: boolean
          id?: number
          price_list_approved?: boolean
          price_list_approved_at?: string | null
          price_list_approved_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      consultation_amendments: {
        Row: {
          consultation_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string
          patient_id: string
          section: string | null
          visit_id: string
        }
        Insert: {
          consultation_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note: string
          patient_id: string
          section?: string | null
          visit_id: string
        }
        Update: {
          consultation_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string
          patient_id?: string
          section?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_amendments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_amendments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_amendments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          allergy_history: string | null
          assessment: string | null
          chief_complaint: string | null
          clinician_id: string | null
          created_at: string
          examination: string | null
          family_social_history: string | null
          follow_up_date: string | null
          follow_up_plan: string | null
          history: string | null
          id: string
          lab_review_notes: string | null
          medication_history: string | null
          past_history: string | null
          patient_id: string
          referral_notes: string | null
          service_key: string
          signed_at: string | null
          signed_by: string | null
          status: string
          template_data: Json
          treatment_notes: string | null
          updated_at: string
          updated_by: string | null
          visit_id: string
        }
        Insert: {
          allergy_history?: string | null
          assessment?: string | null
          chief_complaint?: string | null
          clinician_id?: string | null
          created_at?: string
          examination?: string | null
          family_social_history?: string | null
          follow_up_date?: string | null
          follow_up_plan?: string | null
          history?: string | null
          id?: string
          lab_review_notes?: string | null
          medication_history?: string | null
          past_history?: string | null
          patient_id: string
          referral_notes?: string | null
          service_key: string
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          template_data?: Json
          treatment_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_id: string
        }
        Update: {
          allergy_history?: string | null
          assessment?: string | null
          chief_complaint?: string | null
          clinician_id?: string | null
          created_at?: string
          examination?: string | null
          family_social_history?: string | null
          follow_up_date?: string | null
          follow_up_plan?: string | null
          history?: string | null
          id?: string
          lab_review_notes?: string | null
          medication_history?: string | null
          past_history?: string | null
          patient_id?: string
          referral_notes?: string | null
          service_key?: string
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          template_data?: Json
          treatment_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_service_key_fkey"
            columns: ["service_key"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "consultations_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_checklist: {
        Row: {
          done: boolean
          done_at: string | null
          done_by: string | null
          gate_key: string
          note: string | null
        }
        Insert: {
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          gate_key: string
          note?: string | null
        }
        Update: {
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          gate_key?: string
          note?: string | null
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          catalog_id: string | null
          consultation_id: string | null
          created_at: string
          created_by: string | null
          description: string
          diagnosis_type: string
          icd10_code: string | null
          id: string
          patient_id: string
          visit_id: string
        }
        Insert: {
          catalog_id?: string | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          diagnosis_type?: string
          icd10_code?: string | null
          id?: string
          patient_id: string
          visit_id: string
        }
        Update: {
          catalog_id?: string | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          diagnosis_type?: string
          icd10_code?: string | null
          id?: string
          patient_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_catalog: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          display_order: number
          icd10_code: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          display_order?: number
          icd10_code?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          display_order?: number
          icd10_code?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          charge_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number
          unit_price: number
        }
        Insert: {
          charge_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity?: number
          unit_price: number
        }
        Update: {
          charge_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "service_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          invoice_number: string | null
          issued_at: string | null
          issued_by: string | null
          notes: string | null
          patient_id: string
          status: string
          updated_at: string
          visit_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          issued_by?: string | null
          notes?: string | null
          patient_id: string
          status?: string
          updated_at?: string
          visit_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          issued_by?: string | null
          notes?: string | null
          patient_id?: string
          status?: string
          updated_at?: string
          visit_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_request_items: {
        Row: {
          abnormal_flag: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          collected_at: string | null
          collected_by: string | null
          current_specimen_id: string | null
          id: string
          lab_request_id: string
          lab_test_id: string
          processed_at: string | null
          processed_by: string | null
          received_at: string | null
          received_by: string | null
          rejection_reason: string | null
          result_comment: string | null
          result_value: string | null
          resulted_at: string | null
          resulted_by: string | null
          returned_reason: string | null
          specimen_id: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          abnormal_flag?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          collected_at?: string | null
          collected_by?: string | null
          current_specimen_id?: string | null
          id?: string
          lab_request_id: string
          lab_test_id: string
          processed_at?: string | null
          processed_by?: string | null
          received_at?: string | null
          received_by?: string | null
          rejection_reason?: string | null
          result_comment?: string | null
          result_value?: string | null
          resulted_at?: string | null
          resulted_by?: string | null
          returned_reason?: string | null
          specimen_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          abnormal_flag?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          collected_at?: string | null
          collected_by?: string | null
          current_specimen_id?: string | null
          id?: string
          lab_request_id?: string
          lab_test_id?: string
          processed_at?: string | null
          processed_by?: string | null
          received_at?: string | null
          received_by?: string | null
          rejection_reason?: string | null
          result_comment?: string | null
          result_value?: string | null
          resulted_at?: string | null
          resulted_by?: string | null
          returned_reason?: string | null
          specimen_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_request_items_current_specimen_id_fkey"
            columns: ["current_specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_request_items_lab_request_id_fkey"
            columns: ["lab_request_id"]
            isOneToOne: false
            referencedRelation: "lab_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_request_items_lab_test_id_fkey"
            columns: ["lab_test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_requests: {
        Row: {
          clinical_notes: string | null
          consultation_id: string | null
          created_at: string
          id: string
          patient_id: string
          priority: string
          request_number: string | null
          requested_by: string | null
          status: string
          visit_id: string
        }
        Insert: {
          clinical_notes?: string | null
          consultation_id?: string | null
          created_at?: string
          id?: string
          patient_id: string
          priority?: string
          request_number?: string | null
          requested_by?: string | null
          status?: string
          visit_id: string
        }
        Update: {
          clinical_notes?: string | null
          consultation_id?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          priority?: string
          request_number?: string | null
          requested_by?: string | null
          status?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_requests_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_requests_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_result_amendments: {
        Row: {
          amended_by: string | null
          created_at: string
          id: string
          item_id: string
          lab_request_id: string
          patient_id: string
          previous_comment: string | null
          previous_entered_at: string | null
          previous_entered_by: string | null
          previous_flag: string | null
          previous_ref_high: number | null
          previous_ref_low: number | null
          previous_ref_text: string | null
          previous_unit: string | null
          previous_value: string | null
          previous_verified_at: string | null
          previous_verified_by: string | null
          reason: string
        }
        Insert: {
          amended_by?: string | null
          created_at?: string
          id?: string
          item_id: string
          lab_request_id: string
          patient_id: string
          previous_comment?: string | null
          previous_entered_at?: string | null
          previous_entered_by?: string | null
          previous_flag?: string | null
          previous_ref_high?: number | null
          previous_ref_low?: number | null
          previous_ref_text?: string | null
          previous_unit?: string | null
          previous_value?: string | null
          previous_verified_at?: string | null
          previous_verified_by?: string | null
          reason: string
        }
        Update: {
          amended_by?: string | null
          created_at?: string
          id?: string
          item_id?: string
          lab_request_id?: string
          patient_id?: string
          previous_comment?: string | null
          previous_entered_at?: string | null
          previous_entered_by?: string | null
          previous_flag?: string | null
          previous_ref_high?: number | null
          previous_ref_low?: number | null
          previous_ref_text?: string | null
          previous_unit?: string | null
          previous_value?: string | null
          previous_verified_at?: string | null
          previous_verified_by?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_result_amendments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "lab_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_amendments_lab_request_id_fkey"
            columns: ["lab_request_id"]
            isOneToOne: false
            referencedRelation: "lab_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_amendments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          abnormal_flag: string | null
          comment: string | null
          created_at: string
          entered_at: string
          entered_by: string | null
          id: string
          item_id: string
          ref_high: number | null
          ref_low: number | null
          ref_text: string | null
          unit: string | null
          value: string
        }
        Insert: {
          abnormal_flag?: string | null
          comment?: string | null
          created_at?: string
          entered_at?: string
          entered_by?: string | null
          id?: string
          item_id: string
          ref_high?: number | null
          ref_low?: number | null
          ref_text?: string | null
          unit?: string | null
          value: string
        }
        Update: {
          abnormal_flag?: string | null
          comment?: string | null
          created_at?: string
          entered_at?: string
          entered_by?: string | null
          id?: string
          item_id?: string
          ref_high?: number | null
          ref_low?: number | null
          ref_text?: string | null
          unit?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "lab_request_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_specimen_tests: {
        Row: {
          created_at: string
          id: string
          item_id: string
          specimen_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          specimen_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          specimen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_specimen_tests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "lab_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_specimen_tests_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_specimens: {
        Row: {
          accession_number: string | null
          collected_at: string
          collected_by: string | null
          condition: string | null
          created_at: string
          id: string
          lab_request_id: string
          notes: string | null
          patient_id: string
          received_at: string | null
          received_by: string | null
          recorded_by: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          replaces_specimen_id: string | null
          specimen_type: string
          status: string
        }
        Insert: {
          accession_number?: string | null
          collected_at?: string
          collected_by?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          lab_request_id: string
          notes?: string | null
          patient_id: string
          received_at?: string | null
          received_by?: string | null
          recorded_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          replaces_specimen_id?: string | null
          specimen_type: string
          status?: string
        }
        Update: {
          accession_number?: string | null
          collected_at?: string
          collected_by?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          lab_request_id?: string
          notes?: string | null
          patient_id?: string
          received_at?: string | null
          received_by?: string | null
          recorded_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          replaces_specimen_id?: string | null
          specimen_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_specimens_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_specimens_lab_request_id_fkey"
            columns: ["lab_request_id"]
            isOneToOne: false
            referencedRelation: "lab_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_specimens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_specimens_replaces_specimen_id_fkey"
            columns: ["replaces_specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_test_reference_ranges: {
        Row: {
          age_max_years: number | null
          age_min_years: number | null
          created_at: string
          created_by: string | null
          id: string
          lab_test_id: string
          note: string | null
          pregnancy: boolean
          ref_high: number | null
          ref_low: number | null
          ref_text: string | null
          sex: string | null
          unit: string | null
        }
        Insert: {
          age_max_years?: number | null
          age_min_years?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lab_test_id: string
          note?: string | null
          pregnancy?: boolean
          ref_high?: number | null
          ref_low?: number | null
          ref_text?: string | null
          sex?: string | null
          unit?: string | null
        }
        Update: {
          age_max_years?: number | null
          age_min_years?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lab_test_id?: string
          note?: string | null
          pregnancy?: boolean
          ref_high?: number | null
          ref_low?: number | null
          ref_text?: string | null
          sex?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_test_reference_ranges_lab_test_id_fkey"
            columns: ["lab_test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          abnormal_options: string[] | null
          active: boolean
          analyzer: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          catalogue_note: string | null
          code: string
          critical_high: number | null
          critical_low: number | null
          display_order: number
          id: string
          method: string | null
          name: string
          panel: string | null
          ref_high: number | null
          ref_low: number | null
          ref_text: string | null
          reference_source: string | null
          reference_updated_at: string | null
          reference_updated_by: string | null
          result_options: string[] | null
          result_type: string
          section: string
          specimen_type: string | null
          unit: string | null
        }
        Insert: {
          abnormal_options?: string[] | null
          active?: boolean
          analyzer?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          catalogue_note?: string | null
          code: string
          critical_high?: number | null
          critical_low?: number | null
          display_order?: number
          id?: string
          method?: string | null
          name: string
          panel?: string | null
          ref_high?: number | null
          ref_low?: number | null
          ref_text?: string | null
          reference_source?: string | null
          reference_updated_at?: string | null
          reference_updated_by?: string | null
          result_options?: string[] | null
          result_type?: string
          section: string
          specimen_type?: string | null
          unit?: string | null
        }
        Update: {
          abnormal_options?: string[] | null
          active?: boolean
          analyzer?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          catalogue_note?: string | null
          code?: string
          critical_high?: number | null
          critical_low?: number | null
          display_order?: number
          id?: string
          method?: string | null
          name?: string
          panel?: string | null
          ref_high?: number | null
          ref_low?: number | null
          ref_text?: string | null
          reference_source?: string | null
          reference_updated_at?: string | null
          reference_updated_by?: string | null
          result_options?: string[] | null
          result_type?: string
          section?: string
          specimen_type?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      medication_instructions: {
        Row: {
          consultation_id: string
          created_at: string
          created_by: string | null
          dose: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medicine: string
          patient_id: string
          route: string | null
          visit_id: string
        }
        Insert: {
          consultation_id: string
          created_at?: string
          created_by?: string | null
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine: string
          patient_id: string
          route?: string | null
          visit_id: string
        }
        Update: {
          consultation_id?: string
          created_at?: string
          created_by?: string | null
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine?: string
          patient_id?: string
          route?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_instructions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_instructions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_instructions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          archived_reason: string | null
          correction_note: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          dob_estimated: boolean
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          estimated_age: number | null
          estimated_age_unit: string | null
          first_name: string
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          id: string
          kebele: string | null
          last_name: string
          middle_name: string | null
          mrn: string
          phone: string | null
          region: string | null
          sex: string
          town: string | null
          updated_at: string
          woreda: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          correction_note?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          dob_estimated?: boolean
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          estimated_age?: number | null
          estimated_age_unit?: string | null
          first_name: string
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          kebele?: string | null
          last_name?: string
          middle_name?: string | null
          mrn: string
          phone?: string | null
          region?: string | null
          sex: string
          town?: string | null
          updated_at?: string
          woreda?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          correction_note?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          dob_estimated?: boolean
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          estimated_age?: number | null
          estimated_age_unit?: string | null
          first_name?: string
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          kebele?: string | null
          last_name?: string
          middle_name?: string | null
          mrn?: string
          phone?: string | null
          region?: string | null
          sex?: string
          town?: string | null
          updated_at?: string
          woreda?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          id: string
          invoice_id: string
          method: string
          receipt_number: string | null
          received_at: string
          received_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          id?: string
          invoice_id: string
          method: string
          receipt_number?: string | null
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          id?: string
          invoice_id?: string
          method?: string
          receipt_number?: string | null
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          charge_id: string
          id: number
          new_price: number
          old_price: number | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          charge_id: string
          id?: never
          new_price: number
          old_price?: number | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          charge_id?: string
          id?: never
          new_price?: number
          old_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "service_charges"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          can_self_verify: boolean
          can_verify_lab: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          staff_number: string | null
        }
        Insert: {
          active?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          can_self_verify?: boolean
          can_verify_lab?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          staff_number?: string | null
        }
        Update: {
          active?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          can_self_verify?: boolean
          can_verify_lab?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          staff_number?: string | null
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          active: boolean
          display_order: number
          key: string
          name: string
        }
        Insert: {
          active?: boolean
          display_order?: number
          key: string
          name: string
        }
        Update: {
          active?: boolean
          display_order?: number
          key?: string
          name?: string
        }
        Relationships: []
      }
      service_charges: {
        Row: {
          active: boolean
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          currency: string
          description: string | null
          display_order: number
          effective_date: string | null
          expiry_date: string | null
          id: string
          lab_test_id: string | null
          name: string
          price: number
          service_key: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          lab_test_id?: string | null
          name: string
          price: number
          service_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          lab_test_id?: string | null
          name?: string
          price?: number
          service_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_charges_lab_test_id_fkey"
            columns: ["lab_test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_charges_service_key_fkey"
            columns: ["service_key"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          appointment_id: string | null
          assigned_clinician_id: string | null
          checked_in_at: string
          checked_in_by: string | null
          completed_at: string | null
          id: string
          patient_id: string
          queue_date: string
          queue_number: number | null
          reception_notes: string | null
          service_key: string
          started_at: string | null
          status: string
          visit_type: string
        }
        Insert: {
          appointment_id?: string | null
          assigned_clinician_id?: string | null
          checked_in_at?: string
          checked_in_by?: string | null
          completed_at?: string | null
          id?: string
          patient_id: string
          queue_date?: string
          queue_number?: number | null
          reception_notes?: string | null
          service_key: string
          started_at?: string | null
          status?: string
          visit_type?: string
        }
        Update: {
          appointment_id?: string | null
          assigned_clinician_id?: string | null
          checked_in_at?: string
          checked_in_by?: string | null
          completed_at?: string | null
          id?: string
          patient_id?: string
          queue_date?: string
          queue_number?: number | null
          reception_notes?: string | null
          service_key?: string
          started_at?: string | null
          status?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_assigned_clinician_id_fkey"
            columns: ["assigned_clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_service_key_fkey"
            columns: ["service_key"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      vital_signs: {
        Row: {
          blood_glucose: number | null
          bmi: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          height_cm: number | null
          id: string
          patient_id: string
          pulse: number | null
          recorded_at: string
          recorded_by: string | null
          resp_rate: number | null
          spo2: number | null
          temperature: number | null
          visit_id: string
          weight_kg: number | null
        }
        Insert: {
          blood_glucose?: number | null
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          height_cm?: number | null
          id?: string
          patient_id: string
          pulse?: number | null
          recorded_at?: string
          recorded_by?: string | null
          resp_rate?: number | null
          spo2?: number | null
          temperature?: number | null
          visit_id: string
          weight_kg?: number | null
        }
        Update: {
          blood_glucose?: number | null
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          height_cm?: number | null
          id?: string
          patient_id?: string
          pulse?: number | null
          recorded_at?: string
          recorded_by?: string | null
          resp_rate?: number | null
          spo2?: number | null
          temperature?: number | null
          visit_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_signs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vital_signs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      invoice_balances: {
        Row: {
          balance: number | null
          discount: number | null
          invoice_id: string | null
          paid: number | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      age_band: { Args: { _dob: string; _on: string }; Returns: string }
      amend_lab_result: {
        Args: { _item_id: string; _reason: string }
        Returns: undefined
      }
      approve_charge: { Args: { _charge_id: string }; Returns: undefined }
      approve_lab_test: { Args: { _test_id: string }; Returns: undefined }
      approve_price_list: { Args: { _note: string }; Returns: undefined }
      approve_staff_registration: {
        Args: {
          _can_verify_lab?: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      billing_enabled: { Args: never; Returns: boolean }
      bootstrap_first_admin: { Args: { _user_id: string }; Returns: undefined }
      can_verify_lab: { Args: { _user_id: string }; Returns: boolean }
      clinic_date: { Args: { _ts: string }; Returns: string }
      clinic_today: { Args: never; Returns: string }
      collect_specimen: {
        Args: {
          _collected_at?: string
          _collected_by?: string
          _condition?: string
          _item_ids: string[]
          _notes?: string
          _received?: boolean
          _request_id: string
          _specimen_type: string
        }
        Returns: Json
      }
      create_lab_order: {
        Args: {
          _notes?: string
          _priority?: string
          _test_ids: string[]
          _visit_id: string
        }
        Returns: Json
      }
      find_possible_duplicates: {
        Args: { _dob: string; _father: string; _first: string; _phone: string }
        Returns: {
          date_of_birth: string
          first_name: string
          id: string
          last_name: string
          middle_name: string
          mrn: string
          phone: string
          reason: string
          sex: string
          town: string
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invoice_balance: { Args: { _invoice: string }; Returns: number }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      receive_specimen: {
        Args: { _condition: string; _notes?: string; _specimen_id: string }
        Returns: undefined
      }
      reject_specimen: {
        Args: { _condition?: string; _reason: string; _specimen_id: string }
        Returns: undefined
      }
      reject_staff_registration: {
        Args: { _reason: string; _user_id: string }
        Returns: undefined
      }
      report_admin_summary: { Args: { _day?: string }; Returns: Json }
      report_appointments_queue: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      report_audit_events: {
        Args: {
          _action?: string
          _from: string
          _limit?: number
          _offset?: number
          _table?: string
          _to: string
          _user?: string
        }
        Returns: Json
      }
      report_billing: { Args: { _from: string; _to: string }; Returns: Json }
      report_guard: { Args: { _from: string; _to: string }; Returns: undefined }
      report_lab_turnaround: {
        Args: { _from: string; _limit?: number; _offset?: number; _to: string }
        Returns: Json
      }
      report_lab_volume: { Args: { _from: string; _to: string }; Returns: Json }
      report_opd_attendance: {
        Args: { _from: string; _group?: string; _to: string }
        Returns: Json
      }
      report_registrations: {
        Args: { _from: string; _limit?: number; _offset?: number; _to: string }
        Returns: Json
      }
      report_service_utilization: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      report_staff_activity: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      save_lab_result: {
        Args: {
          _comment?: string
          _flag?: string
          _item_id: string
          _value: string
        }
        Returns: Json
      }
      update_my_profile: {
        Args: { _full_name: string; _phone: string }
        Returns: undefined
      }
      void_invoice: {
        Args: { _invoice_id: string; _reason: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "receptionist" | "clinician" | "lab_tech"
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
      app_role: ["admin", "receptionist", "clinician", "lab_tech"],
    },
  },
} as const

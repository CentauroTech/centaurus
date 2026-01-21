import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

export interface BillingProfile {
  id: string;
  teamMemberId: string;
  
  // Personal Info
  firstName: string;
  lastName: string;
  artisticName?: string;
  email: string;
  phoneNumber?: string;
  
  // Address
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  
  // Tax & Banking
  taxId?: string;
  preferredCurrency: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  bankAccountHolder?: string;
  paypalEmail?: string;
  
  // Business Fields
  isBusiness: boolean;
  businessName?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessPostalCode?: string;
  businessCountry?: string;
  businessId?: string;
  businessPhone?: string;
  
  // Lock Status
  isLocked: boolean;
  lockedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillingProfileData {
  firstName: string;
  lastName: string;
  artisticName?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  preferredCurrency?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  bankAccountHolder?: string;
  paypalEmail?: string;
  isBusiness?: boolean;
  businessName?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessPostalCode?: string;
  businessCountry?: string;
  businessId?: string;
  businessPhone?: string;
}

function mapProfile(row: any): BillingProfile {
  return {
    id: row.id,
    teamMemberId: row.team_member_id,
    firstName: row.first_name,
    lastName: row.last_name,
    artisticName: row.artistic_name,
    email: row.email,
    phoneNumber: row.phone_number,
    address: row.address,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    taxId: row.tax_id,
    preferredCurrency: row.preferred_currency || 'USD',
    bankName: row.bank_name,
    bankAccountNumber: row.bank_account_number,
    bankRoutingNumber: row.bank_routing_number,
    bankAccountHolder: row.bank_account_holder,
    paypalEmail: row.paypal_email,
    isBusiness: row.is_business || false,
    businessName: row.business_name,
    businessEmail: row.business_email,
    businessAddress: row.business_address,
    businessCity: row.business_city,
    businessState: row.business_state,
    businessPostalCode: row.business_postal_code,
    businessCountry: row.business_country,
    businessId: row.business_id,
    businessPhone: row.business_phone,
    isLocked: row.is_locked || false,
    lockedAt: row.locked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useBillingProfile() {
  const { data: currentMember } = useCurrentTeamMember();

  return useQuery({
    queryKey: ['billing-profile', currentMember?.id],
    queryFn: async (): Promise<BillingProfile | null> => {
      if (!currentMember?.id) return null;

      const { data, error } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('team_member_id', currentMember.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return mapProfile(data);
    },
    enabled: !!currentMember?.id,
  });
}

export function useCreateBillingProfile() {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async (data: CreateBillingProfileData) => {
      if (!currentMember?.id) throw new Error('Not authenticated');

      const { data: profile, error } = await supabase
        .from('billing_profiles')
        .insert({
          team_member_id: currentMember.id,
          first_name: data.firstName,
          last_name: data.lastName,
          artistic_name: data.artisticName || null,
          email: data.email,
          phone_number: data.phoneNumber || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          postal_code: data.postalCode || null,
          country: data.country || null,
          tax_id: data.taxId || null,
          preferred_currency: data.preferredCurrency || 'USD',
          bank_name: data.bankName || null,
          bank_account_number: data.bankAccountNumber || null,
          bank_routing_number: data.bankRoutingNumber || null,
          bank_account_holder: data.bankAccountHolder || null,
          paypal_email: data.paypalEmail || null,
          is_business: data.isBusiness || false,
          business_name: data.businessName || null,
          business_email: data.businessEmail || null,
          business_address: data.businessAddress || null,
          business_city: data.businessCity || null,
          business_state: data.businessState || null,
          business_postal_code: data.businessPostalCode || null,
          business_country: data.businessCountry || null,
          business_id: data.businessId || null,
          business_phone: data.businessPhone || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-profile'] });
    },
  });
}

export function useUpdateBillingProfile() {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async (data: Partial<CreateBillingProfileData>) => {
      if (!currentMember?.id) throw new Error('Not authenticated');

      const updates: Record<string, any> = {};
      
      if (data.firstName !== undefined) updates.first_name = data.firstName;
      if (data.lastName !== undefined) updates.last_name = data.lastName;
      if (data.artisticName !== undefined) updates.artistic_name = data.artisticName;
      if (data.email !== undefined) updates.email = data.email;
      if (data.phoneNumber !== undefined) updates.phone_number = data.phoneNumber;
      if (data.address !== undefined) updates.address = data.address;
      if (data.city !== undefined) updates.city = data.city;
      if (data.state !== undefined) updates.state = data.state;
      if (data.postalCode !== undefined) updates.postal_code = data.postalCode;
      if (data.country !== undefined) updates.country = data.country;
      if (data.taxId !== undefined) updates.tax_id = data.taxId;
      if (data.preferredCurrency !== undefined) updates.preferred_currency = data.preferredCurrency;
      if (data.bankName !== undefined) updates.bank_name = data.bankName;
      if (data.bankAccountNumber !== undefined) updates.bank_account_number = data.bankAccountNumber;
      if (data.bankRoutingNumber !== undefined) updates.bank_routing_number = data.bankRoutingNumber;
      if (data.bankAccountHolder !== undefined) updates.bank_account_holder = data.bankAccountHolder;
      if (data.paypalEmail !== undefined) updates.paypal_email = data.paypalEmail;
      if (data.isBusiness !== undefined) updates.is_business = data.isBusiness;
      if (data.businessName !== undefined) updates.business_name = data.businessName;
      if (data.businessEmail !== undefined) updates.business_email = data.businessEmail;
      if (data.businessAddress !== undefined) updates.business_address = data.businessAddress;
      if (data.businessCity !== undefined) updates.business_city = data.businessCity;
      if (data.businessState !== undefined) updates.business_state = data.businessState;
      if (data.businessPostalCode !== undefined) updates.business_postal_code = data.businessPostalCode;
      if (data.businessCountry !== undefined) updates.business_country = data.businessCountry;
      if (data.businessId !== undefined) updates.business_id = data.businessId;
      if (data.businessPhone !== undefined) updates.business_phone = data.businessPhone;

      const { data: profile, error } = await supabase
        .from('billing_profiles')
        .update(updates)
        .eq('team_member_id', currentMember.id)
        .select()
        .single();

      if (error) throw error;
      return mapProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-profile'] });
    },
  });
}

// Admin hook for project managers
export function useAllBillingProfiles() {
  return useQuery({
    queryKey: ['all-billing-profiles'],
    queryFn: async (): Promise<(BillingProfile & { teamMemberName?: string })[]> => {
      const { data, error } = await supabase
        .from('billing_profiles')
        .select(`
          *,
          team_members!billing_profiles_team_member_id_fkey (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        ...mapProfile(row),
        teamMemberName: (row as any).team_members?.name,
      }));
    },
  });
}

export function useUnlockBillingProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { data, error } = await supabase
        .from('billing_profiles')
        .update({ is_locked: false, locked_at: null })
        .eq('id', profileId)
        .select()
        .single();

      if (error) throw error;
      return mapProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-profile'] });
      queryClient.invalidateQueries({ queryKey: ['all-billing-profiles'] });
    },
  });
}

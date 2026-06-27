import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { farmersApi } from '../../api/farmers.api';
import { Button, Checkbox, Input, Select, TextArea, Spinner } from '../../components/shared';
import { useToast } from '../../components/shared/Toast';

const ghanaPhoneRegex = /^(\+233|0)[235]\d{8}$/;

const farmerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .regex(ghanaPhoneRegex, 'Enter a valid Ghana phone number (e.g. 0241234567)'),
  gender: z.string().optional(),
  preferredLanguage: z.string().optional(),
  region: z.string().optional(),
  district: z.string().optional(),
  community: z.string().optional(),
  notes: z.string().optional(),
  consentConfirmed: z
    .boolean()
    .refine((val) => val === true, { message: 'Consent confirmation is required' }),
});

type FarmerFormValues = z.infer<typeof farmerSchema>;

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'tw', label: 'Twi' },
  { value: 'ga', label: 'Ga' },
  { value: 'ee', label: 'Ewe' },
];

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const FarmerRegister: React.FC = () => {
  const { farmerId } = useParams<{ farmerId?: string }>();
  const isEdit = Boolean(farmerId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: existingFarmer, isLoading: loadingFarmer } = useQuery({
    queryKey: ['farmer', farmerId],
    queryFn: () => farmersApi.getFarmer(farmerId!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FarmerFormValues>({
    resolver: zodResolver(farmerSchema),
    values: existingFarmer
      ? {
          fullName: existingFarmer.fullName,
          phone: existingFarmer.phone ?? '',
          gender: existingFarmer.gender ?? '',
          preferredLanguage: existingFarmer.preferredLanguage ?? '',
          region: existingFarmer.region ?? '',
          district: existingFarmer.district ?? '',
          community: existingFarmer.community ?? '',
          notes: existingFarmer.notes ?? '',
          consentConfirmed: true,
        }
      : undefined,
    defaultValues: {
      fullName: '',
      phone: '',
      gender: '',
      preferredLanguage: '',
      region: '',
      district: '',
      community: '',
      notes: '',
      consentConfirmed: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: farmersApi.createFarmer,
    onSuccess: (farmer) => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
      addToast('Farmer registered successfully', 'success');
      navigate(`/agent/farmers/${farmer._id}`);
    },
    onError: () => addToast('Failed to register farmer', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: FarmerFormValues) =>
      farmersApi.updateFarmer(farmerId!, {
        fullName: values.fullName,
        phone: values.phone,
        gender: values.gender || undefined,
        preferredLanguage: values.preferredLanguage || undefined,
        region: values.region || undefined,
        district: values.district || undefined,
        community: values.community || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: (farmer) => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
      queryClient.invalidateQueries({ queryKey: ['farmer', farmer._id] });
      addToast('Farmer updated successfully', 'success');
      navigate(`/agent/farmers/${farmer._id}`);
    },
    onError: () => addToast('Failed to update farmer', 'error'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FarmerFormValues) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate({
        fullName: values.fullName,
        phone: values.phone,
        gender: values.gender || undefined,
        preferredLanguage: values.preferredLanguage || undefined,
        region: values.region || undefined,
        district: values.district || undefined,
        community: values.community || undefined,
        notes: values.notes || undefined,
        consentConfirmed: values.consentConfirmed,
      });
    }
  };

  if (isEdit && loadingFarmer) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/agent/farmers" className="text-sm text-primary-600 hover:underline">
          ← Back to farmers
        </Link>
        <h1 className="text-2xl font-bold text-surface-900 mt-2">
          {isEdit ? 'Edit Farmer' : 'Register Farmer'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <Input label="Full name *" {...register('fullName')} error={errors.fullName?.message} />

        <Input
          label="Phone *"
          placeholder="0241234567"
          {...register('phone')}
          error={errors.phone?.message}
        />

        <Select
          label="Gender"
          options={GENDER_OPTIONS}
          placeholder="Select gender"
          {...register('gender')}
        />

        <Select
          label="Preferred language"
          options={LANGUAGE_OPTIONS}
          placeholder="Select language"
          {...register('preferredLanguage')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Region" {...register('region')} />
          <Input label="District" {...register('district')} />
          <Input label="Community" {...register('community')} />
        </div>

        <TextArea label="Notes" rows={3} {...register('notes')} />

        {!isEdit && (
          <Checkbox
            label="Farmer has given verbal consent to be registered and to have their voice and produce listed"
            {...register('consentConfirmed')}
            error={errors.consentConfirmed?.message}
          />
        )}

        <Button type="submit" size="lg" loading={isPending} disabled={isPending} className="w-full">
          {isEdit ? 'Save changes' : 'Register farmer'}
        </Button>
      </form>
    </div>
  );
};

export default FarmerRegister;

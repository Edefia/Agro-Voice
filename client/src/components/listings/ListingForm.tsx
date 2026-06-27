import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, DatePicker, Input, TextArea } from '../shared';
import type { Listing, ListingFormPayload } from '../../api/listings.api';

const listingFormSchema = z.object({
  crop: z.string().optional(),
  quantity: z.union([z.number(), z.string()]).optional(),
  unit: z.string().optional(),
  pricePerUnit: z.union([z.number(), z.string()]).optional(),
  availableDate: z.string().optional(),
  expiryDate: z.string().optional(),
  description: z.string().optional(),
  region: z.string().optional(),
  district: z.string().optional(),
  community: z.string().optional(),
});

type ListingFormValues = {
  crop?: string;
  quantity?: number | string;
  unit?: string;
  pricePerUnit?: number | string;
  availableDate?: string;
  expiryDate?: string;
  description?: string;
  region?: string;
  district?: string;
  community?: string;
};

export interface ListingFormProps {
  initialValues?: Partial<Listing>;
  onSave: (payload: ListingFormPayload) => Promise<void>;
  saving?: boolean;
}

function toFormValues(listing?: Partial<Listing>): ListingFormValues {
  return {
    crop: listing?.crop ?? '',
    quantity: listing?.quantity,
    unit: listing?.unit ?? '',
    pricePerUnit: listing?.pricePerUnit,
    availableDate: listing?.availableDate?.slice(0, 10) ?? '',
    expiryDate: listing?.expiryDate?.slice(0, 10) ?? '',
    description: listing?.description ?? '',
    region: listing?.region ?? '',
    district: listing?.district ?? '',
    community: listing?.community ?? '',
  };
}

function isPastDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function fieldHighlight(
  name: keyof ListingFormValues,
  values: ListingFormValues
): string | undefined {
  switch (name) {
    case 'crop':
      return !values.crop?.trim() ? 'Crop is required' : undefined;
    case 'quantity':
      if (values.quantity == null || values.quantity === ('' as unknown as number))
        return 'Quantity is required';
      if (Number(values.quantity) === 0) return 'Quantity must be greater than 0';
      return undefined;
    case 'unit':
      return !values.unit?.trim() ? 'Unit is required' : undefined;
    case 'pricePerUnit':
      if (values.pricePerUnit == null) return 'Price per unit is required';
      if (Number(values.pricePerUnit) === 0) return 'Price must be greater than 0';
      return undefined;
    case 'availableDate':
      if (!values.availableDate?.trim()) return 'Available date is required';
      if (isPastDate(values.availableDate)) return 'Available date cannot be in the past';
      return undefined;
    default:
      return undefined;
  }
}

export const ListingForm: React.FC<ListingFormProps> = ({
  initialValues,
  onSave,
  saving = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: toFormValues(initialValues),
  });

  const values = watch();

  useEffect(() => {
    reset(toFormValues(initialValues));
  }, [initialValues, reset]);

  const onSubmit = async (data: ListingFormValues) => {
    await onSave({
      crop: data.crop,
      quantity: data.quantity != null && data.quantity !== '' ? Number(data.quantity) : undefined,
      unit: data.unit,
      pricePerUnit:
        data.pricePerUnit != null && data.pricePerUnit !== ''
          ? Number(data.pricePerUnit)
          : undefined,
      availableDate: data.availableDate || undefined,
      expiryDate: data.expiryDate || undefined,
      description: data.description,
      region: data.region,
      district: data.district,
      community: data.community,
    });
  };

  const highlight = (name: keyof ListingFormValues) => {
    const msg = fieldHighlight(name, values);
    return msg ?? errors[name]?.message;
  };

  const errorClass = (name: keyof ListingFormValues) =>
    highlight(name) ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Crop"
        {...register('crop')}
        error={highlight('crop')}
        className={errorClass('crop')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Quantity"
          type="number"
          min={0}
          step="any"
          {...register('quantity')}
          error={highlight('quantity')}
          className={errorClass('quantity')}
        />
        <Input
          label="Unit"
          placeholder="e.g. kg, crate, bag"
          {...register('unit')}
          error={highlight('unit')}
          className={errorClass('unit')}
        />
      </div>

      <Input
        label="Price per unit (GHS)"
        type="number"
        min={0}
        step="any"
        {...register('pricePerUnit')}
        error={highlight('pricePerUnit')}
        className={errorClass('pricePerUnit')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker
          label="Available date"
          {...register('availableDate')}
          error={highlight('availableDate')}
          className={errorClass('availableDate')}
        />
        <DatePicker label="Expiry date (optional)" {...register('expiryDate')} />
      </div>

      <TextArea label="Description" rows={3} {...register('description')} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Region" {...register('region')} />
        <Input label="District" {...register('district')} />
        <Input label="Community" {...register('community')} />
      </div>

      <Button type="submit" size="lg" loading={saving} className="w-full sm:w-auto">
        Save changes
      </Button>
    </form>
  );
};

export default ListingForm;

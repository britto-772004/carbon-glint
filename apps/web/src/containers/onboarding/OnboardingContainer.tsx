import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { completeOnboardingMutation, getMeQueryKey, listIndustriesOptions, type Me } from '@carbon-glint/sdk';
import { useNavigate } from 'react-router';
import { OnboardingWizard, type OnboardingValues } from '../../components/onboarding/OnboardingWizard';
import { ONBOARDING_STEPS } from '../../components/onboarding/steps';
import { toErrorMessage } from '../../lib/errors';
import { useMe } from '../session/useMe';

export function OnboardingContainer() {
  const { me } = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const industries = useQuery(listIndustriesOptions());
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<OnboardingValues>({
    companyName: me?.tenant?.name ?? '',
    industryId: '',
    employeeBand: '',
    businessUnitCount: '',
    website: me?.tenant ? `https://${me.tenant.emailDomain}` : '',
    linkedinUrl: '',
  });

  const complete = useMutation({
    ...completeOnboardingMutation(),
    onSuccess: (tenant) => {
      queryClient.setQueryData<Me>(getMeQueryKey(), (old) => (old ? { ...old, tenant } : old));
      navigate('/app/dashboard', { replace: true });
    },
  });

  const onNext = (partial: Partial<OnboardingValues>) => {
    const next = { ...values, ...partial };
    setValues(next);
    if (step < ONBOARDING_STEPS.length - 1) return setStep(step + 1);
    complete.mutate({
      body: {
        companyName: next.companyName,
        industryId: next.industryId,
        employeeBand: next.employeeBand as Exclude<OnboardingValues['employeeBand'], ''>,
        businessUnitCount: Number(next.businessUnitCount),
        website: next.website,
        linkedinUrl: next.linkedinUrl.trim() || null,
      },
    });
  };

  return (
    <OnboardingWizard
      step={step}
      values={values}
      industries={industries.data ?? []}
      isLoadingIndustries={industries.isPending}
      onNext={onNext}
      onBack={() => setStep(Math.max(0, step - 1))}
      isSubmitting={complete.isPending}
      error={toErrorMessage(complete.error ?? industries.error)}
    />
  );
}

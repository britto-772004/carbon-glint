import type { FormEvent } from 'react';
import type { EmployeeBand, Industry } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { formValues } from '../../lib/errors';
import { BrandMark } from '../common/BrandMark';
import { ONBOARDING_STEPS } from './steps';

export interface OnboardingValues {
  companyName: string;
  industryId: string;
  employeeBand: EmployeeBand | '';
  businessUnitCount: string;
  website: string;
  linkedinUrl: string;
}

const BANDS: EmployeeBand[] = ['1-50', '51-250', '251-1000', '1001-5000', '5000+'];

export interface OnboardingWizardProps {
  step: number;
  values: OnboardingValues;
  industries: Industry[];
  isLoadingIndustries: boolean;
  onNext: (partial: Partial<OnboardingValues>) => void;
  onBack: () => void;
  isSubmitting: boolean;
  error?: string;
}

/** Multi-step onboarding. Step + accumulated values live in the container; each step is a stateless form. */
export function OnboardingWizard({
  step,
  values,
  industries,
  isLoadingIndustries,
  onNext,
  onBack,
  isSubmitting,
  error,
}: OnboardingWizardProps) {
  const isLast = step === ONBOARDING_STEPS.length - 1;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onNext(formValues(e.currentTarget) as Partial<OnboardingValues>);
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <BrandMark />
      <Typography variant="h4" component="h1" sx={{ mt: 4 }}>
        Tell us about your company
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        This tailors the GHG categories and reports to your industry. You can change it later.
      </Typography>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {ONBOARDING_STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Card>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* key forces fresh defaultValues per step */}
          <Stack component="form" key={step} spacing={2.5} onSubmit={submit}>
            {error && <Alert severity="error">{error}</Alert>}
            {step === 0 && (
              <>
                <TextField name="companyName" label="Company name" required defaultValue={values.companyName} />
                <TextField
                  name="industryId"
                  label="Nature of industry"
                  select
                  required
                  defaultValue={values.industryId}
                  disabled={isLoadingIndustries}
                  helperText="Drives which Scope 1–3 categories we recommend."
                >
                  {industries.map((i) => (
                    <MenuItem key={i.id} value={i.id}>
                      {i.name}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
            {step === 1 && (
              <>
                <TextField
                  name="employeeBand"
                  label="Number of employees"
                  select
                  required
                  defaultValue={values.employeeBand}
                >
                  {BANDS.map((b) => (
                    <MenuItem key={b} value={b}>
                      {b}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  name="businessUnitCount"
                  label="Number of branches / business units"
                  type="number"
                  required
                  defaultValue={values.businessUnitCount}
                  slotProps={{ htmlInput: { min: 1, max: 100000 } }}
                />
              </>
            )}
            {step === 2 && (
              <>
                <TextField
                  name="website"
                  label="Company website"
                  type="url"
                  required
                  placeholder="https://example.com"
                  defaultValue={values.website}
                />
                <TextField
                  name="linkedinUrl"
                  label="LinkedIn (optional)"
                  placeholder="linkedin.com/company/your-company or linkedin.com/in/your-name"
                  defaultValue={values.linkedinUrl}
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                  helperText="Company page or your own profile. Leave blank to skip."
                />
              </>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={onBack} disabled={step === 0 || isSubmitting}>
                Back
              </Button>
              <Button type="submit" variant="contained" loading={isSubmitting}>
                {isLast ? 'Finish and open dashboard' : 'Next'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}

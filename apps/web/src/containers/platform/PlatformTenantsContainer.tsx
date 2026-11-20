import { useQuery } from '@tanstack/react-query';
import { listPlatformTenantsOptions } from '@carbon-glint/sdk';
import { useNavigate, useSearchParams } from 'react-router';
import { TenantTable } from '../../components/platform/TenantTable';
import { toErrorMessage } from '../../lib/errors';

export function PlatformTenantsContainer() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const tenants = useQuery(listPlatformTenantsOptions({ query: q ? { q } : {} }));
  return (
    <TenantTable
      tenants={tenants.data}
      isLoading={tenants.isPending}
      error={toErrorMessage(tenants.error)}
      query={q}
      onSearch={(next) => setParams(next ? { q: next } : {})}
      onOpen={(tenantId) => navigate(`/platform/tenants/${tenantId}`)}
    />
  );
}

import { useQuery } from '@tanstack/react-query';
import { listPlatformTenantsOptions } from '@carbon-glint/sdk';
import { useNavigate, useSearchParams } from 'react-router';
import { TenantTable } from '../../components/platform/TenantTable';
import { toErrorMessage } from '../../lib/errors';
import { paginate, usePagination } from '../../lib/pagination';

export function PlatformTenantsContainer() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const tenants = useQuery(listPlatformTenantsOptions({ query: q ? { q } : {} }));
  const pagination = usePagination(tenants.data?.length ?? 0);
  return (
    <TenantTable
      tenants={tenants.data ? paginate(tenants.data, pagination) : undefined}
      pagination={pagination}
      isLoading={tenants.isPending}
      error={toErrorMessage(tenants.error)}
      query={q}
      onSearch={(next) => setParams(next ? { q: next } : {})}
      onOpen={(tenantId) => navigate(`/platform/tenants/${tenantId}`)}
    />
  );
}

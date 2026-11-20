import type { Schemas } from '@carbon-glint/api-spec';
import type { ServiceDeps } from './index.js';

/**
 * SERVICE — business logic. Calls repositories (and other deps like `ai`), maps models → DTOs
 * (spec types), and throws DomainErrors. No Express, no SQL.
 */
export interface HealthService {
  getHealth(): Promise<Schemas['Health']>;
}

export const createHealthService = ({ repositories, config }: ServiceDeps): HealthService => ({
  async getHealth() {
    const [dbUp, redisUp] = await Promise.all([repositories.system.pingDatabase(), repositories.system.pingRedis()]);
    const status = (up: boolean) => (up ? 'up' : 'down') as const;
    return {
      status: dbUp && redisUp ? 'ok' : 'degraded',
      version: config.APP_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
      checks: { database: status(dbUp), redis: status(redisUp) },
    };
  },
});

import type { AppDeps } from '../app.js';
import type { OperationHandler } from '../openapi/types.js';

export const getHealth =
  ({ database, config }: AppDeps): OperationHandler<'getHealth'> =>
  async (_req, res) => {
    const dbUp = await database.ping();
    res.status(200).json({
      status: dbUp ? 'ok' : 'degraded',
      version: config.APP_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
      checks: { database: dbUp ? 'up' : 'down' },
    });
  };

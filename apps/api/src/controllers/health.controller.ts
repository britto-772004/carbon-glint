import type { Services } from '../services/index.js';
import type { Controller } from '../openapi/types.js';

/**
 * CONTROLLER — calls one service method, sets the status code, forwards errors.
 * Input is already validated against openapi.yaml; output is validated against it in non-prod.
 */
export const getHealth =
  ({ health }: Services): Controller<'getHealth'> =>
  async (_req, res, next) => {
    try {
      res.status(200).json(await health.getHealth());
    } catch (err) {
      next(err);
    }
  };

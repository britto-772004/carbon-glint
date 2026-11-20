import type { Services } from '../services/index.js';
import type { Controller } from '../openapi/types.js';
import { actorOf } from './http.js';

export const createTenantControllers = ({ tenant }: Services) => {
  const listIndustries: Controller<'listIndustries'> = async (_req, res, next) => {
    try {
      res.status(200).json(await tenant.listIndustries());
    } catch (err) {
      next(err);
    }
  };

  const getTenant: Controller<'getTenant'> = async (req, res, next) => {
    try {
      res.status(200).json(await tenant.getTenant(actorOf(req)));
    } catch (err) {
      next(err);
    }
  };

  const completeOnboarding: Controller<'completeOnboarding'> = async (req, res, next) => {
    try {
      res.status(200).json(await tenant.completeOnboarding(actorOf(req), req.body));
    } catch (err) {
      next(err);
    }
  };

  return { listIndustries, getTenant, completeOnboarding };
};

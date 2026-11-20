import type { Services } from '../services/index.js';
import type { Controller } from '../openapi/types.js';
import { actorOf } from './http.js';

export const createPlatformControllers = ({ platform }: Services) => {
  const listPlatformTenants: Controller<'listPlatformTenants'> = async (req, res, next) => {
    try {
      res.status(200).json(await platform.listTenants({ q: req.query.q, status: req.query.status }));
    } catch (err) {
      next(err);
    }
  };

  const getPlatformTenant: Controller<'getPlatformTenant'> = async (req, res, next) => {
    try {
      res.status(200).json(await platform.getTenant(req.params.tenantId));
    } catch (err) {
      next(err);
    }
  };

  const updatePlatformTenant: Controller<'updatePlatformTenant'> = async (req, res, next) => {
    try {
      res.status(200).json(await platform.updateTenantStatus(req.params.tenantId, req.body.status));
    } catch (err) {
      next(err);
    }
  };

  const updatePlatformUser: Controller<'updatePlatformUser'> = async (req, res, next) => {
    try {
      res.status(200).json(await platform.updateUserStatus(actorOf(req), req.params.userId, req.body.status));
    } catch (err) {
      next(err);
    }
  };

  const platformResendVerification: Controller<'platformResendVerification'> = async (req, res, next) => {
    try {
      await platform.resendVerification(req.params.userId);
      res.status(202).json({ message: 'Verification email sent.' });
    } catch (err) {
      next(err);
    }
  };

  return {
    listPlatformTenants,
    getPlatformTenant,
    updatePlatformTenant,
    updatePlatformUser,
    platformResendVerification,
  };
};

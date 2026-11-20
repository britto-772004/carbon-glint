import type { Services } from '../services/index.js';
import type { Controller } from '../openapi/types.js';
import { actorOf } from './http.js';

export const createOrgUnitControllers = ({ orgUnits }: Services) => {
  const listOrgUnits: Controller<'listOrgUnits'> = async (req, res, next) => {
    try {
      res.status(200).json(await orgUnits.list(actorOf(req)));
    } catch (err) {
      next(err);
    }
  };
  const createOrgUnit: Controller<'createOrgUnit'> = async (req, res, next) => {
    try {
      res.status(201).json(await orgUnits.create(actorOf(req), req.body));
    } catch (err) {
      next(err);
    }
  };
  const updateOrgUnit: Controller<'updateOrgUnit'> = async (req, res, next) => {
    try {
      res.status(200).json(await orgUnits.update(actorOf(req), req.params.orgUnitId, req.body));
    } catch (err) {
      next(err);
    }
  };
  const deleteOrgUnit: Controller<'deleteOrgUnit'> = async (req, res, next) => {
    try {
      await orgUnits.remove(actorOf(req), req.params.orgUnitId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
  return { listOrgUnits, createOrgUnit, updateOrgUnit, deleteOrgUnit };
};

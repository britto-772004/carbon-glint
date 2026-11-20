import type { Services } from '../services/index.js';
import type { EmissionQuery } from '../services/emissions.service.js';
import type { Controller } from '../openapi/types.js';
import { actorOf } from './http.js';

const filters = (q: EmissionQuery): EmissionQuery => ({
  scope: q.scope,
  categoryId: q.categoryId,
  activityDefinitionId: q.activityDefinitionId,
  orgUnitId: q.orgUnitId,
  status: q.status,
  from: q.from,
  to: q.to,
});

export const createEmissionsControllers = ({ emissions }: Services) => {
  const listEmissionFactorSources: Controller<'listEmissionFactorSources'> = async (_req, res, next) => {
    try {
      res.status(200).json(await emissions.listSources());
    } catch (err) {
      next(err);
    }
  };
  const searchEmissionFactors: Controller<'searchEmissionFactors'> = async (req, res, next) => {
    try {
      res.status(200).json(await emissions.searchFactors(req.query));
    } catch (err) {
      next(err);
    }
  };
  const getEmissionFactor: Controller<'getEmissionFactor'> = async (req, res, next) => {
    try {
      res.status(200).json(await emissions.getFactor(req.params.factorId));
    } catch (err) {
      next(err);
    }
  };
  const listEmissions: Controller<'listEmissions'> = async (req, res, next) => {
    try {
      res.status(200).json(
        await emissions.list(actorOf(req), filters(req.query), {
          limit: req.query.limit ?? 50,
          offset: req.query.offset ?? 0,
        }),
      );
    } catch (err) {
      next(err);
    }
  };
  const getEmissionsSummary: Controller<'getEmissionsSummary'> = async (req, res, next) => {
    try {
      res.status(200).json(await emissions.summary(actorOf(req), filters(req.query)));
    } catch (err) {
      next(err);
    }
  };
  const getEmissionsHeatmap: Controller<'getEmissionsHeatmap'> = async (req, res, next) => {
    try {
      res
        .status(200)
        .json(
          await emissions.heatmap(actorOf(req), filters(req.query), req.query.groupBy, req.query.bucket ?? 'month'),
        );
    } catch (err) {
      next(err);
    }
  };
  const getEmissionsOrgTree: Controller<'getEmissionsOrgTree'> = async (req, res, next) => {
    try {
      res.status(200).json(await emissions.orgTree(actorOf(req), filters(req.query)));
    } catch (err) {
      next(err);
    }
  };
  const getEmissionTrace: Controller<'getEmissionTrace'> = async (req, res, next) => {
    try {
      res.status(200).json(await emissions.trace(actorOf(req), req.params.activityId));
    } catch (err) {
      next(err);
    }
  };
  const overrideEmission: Controller<'overrideEmission'> = async (req, res, next) => {
    try {
      res.status(200).json(await emissions.override(actorOf(req), req.params.activityId, req.body));
    } catch (err) {
      next(err);
    }
  };
  const revertEmissionOverride: Controller<'revertEmissionOverride'> = async (req, res, next) => {
    try {
      res.status(200).json(await emissions.revert(actorOf(req), req.params.activityId));
    } catch (err) {
      next(err);
    }
  };
  const bulkOverrideEmissions: Controller<'bulkOverrideEmissions'> = async (req, res, next) => {
    try {
      res.status(200).json(await emissions.bulkOverride(actorOf(req), req.body));
    } catch (err) {
      next(err);
    }
  };
  return {
    listEmissionFactorSources,
    searchEmissionFactors,
    getEmissionFactor,
    listEmissions,
    getEmissionsSummary,
    getEmissionsHeatmap,
    getEmissionsOrgTree,
    getEmissionTrace,
    overrideEmission,
    revertEmissionOverride,
    bulkOverrideEmissions,
  };
};

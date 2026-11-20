import type { Response } from 'express';
import { buildActivityTemplateCsv, buildActivityTemplateXlsx } from '../lib/activity-template.js';
import type { Services } from '../services/index.js';
import type { UploadedFile } from '../services/data-source.service.js';
import type { Controller } from '../openapi/types.js';
import { actorOf } from './http.js';

export const createActivityControllers = ({ taxonomy, activityDefinitions: ads, dataSources }: Services) => {
  const listGhgCategories: Controller<'listGhgCategories'> = async (req, res, next) => {
    try {
      res.status(200).json(await taxonomy.listCategories(actorOf(req), req.query.scope));
    } catch (err) {
      next(err);
    }
  };
  const createGhgCategory: Controller<'createGhgCategory'> = async (req, res, next) => {
    try {
      res.status(201).json(await taxonomy.createCategory(actorOf(req), req.body));
    } catch (err) {
      next(err);
    }
  };
  const listActivityDefinitions: Controller<'listActivityDefinitions'> = async (req, res, next) => {
    try {
      res.status(200).json(await ads.list(actorOf(req), { scope: req.query.scope, status: req.query.status }));
    } catch (err) {
      next(err);
    }
  };
  const createActivityDefinition: Controller<'createActivityDefinition'> = async (req, res, next) => {
    try {
      res.status(201).json(await ads.create(actorOf(req), req.body));
    } catch (err) {
      next(err);
    }
  };
  const getActivityDefinition: Controller<'getActivityDefinition'> = async (req, res, next) => {
    try {
      res.status(200).json(await ads.get(actorOf(req), req.params.activityDefinitionId));
    } catch (err) {
      next(err);
    }
  };
  const updateActivityDefinition: Controller<'updateActivityDefinition'> = async (req, res, next) => {
    try {
      res.status(200).json(await ads.update(actorOf(req), req.params.activityDefinitionId, req.body));
    } catch (err) {
      next(err);
    }
  };
  const deleteActivityDefinition: Controller<'deleteActivityDefinition'> = async (req, res, next) => {
    try {
      await ads.remove(actorOf(req), req.params.activityDefinitionId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
  const publishActivityDefinition: Controller<'publishActivityDefinition'> = async (req, res, next) => {
    try {
      res.status(200).json(await ads.publish(actorOf(req), req.params.activityDefinitionId));
    } catch (err) {
      next(err);
    }
  };
  const listActivities: Controller<'listActivities'> = async (req, res, next) => {
    try {
      const page = { limit: req.query.limit ?? 50, offset: req.query.offset ?? 0 };
      res.status(200).json(await ads.listActivities(actorOf(req), req.params.activityDefinitionId, page));
    } catch (err) {
      next(err);
    }
  };
  const deleteActivities: Controller<'deleteActivities'> = async (req, res, next) => {
    try {
      res
        .status(200)
        .json(await ads.deleteActivities(actorOf(req), req.params.activityDefinitionId, req.body.activityIds));
    } catch (err) {
      next(err);
    }
  };
  const recalculateActivityDefinition: Controller<'recalculateActivityDefinition'> = async (req, res, next) => {
    try {
      res.status(202).json(await ads.recalculate(actorOf(req), req.params.activityDefinitionId, req.body ?? {}));
    } catch (err) {
      next(err);
    }
  };
  const uploadDataSource: Controller<'uploadDataSource'> = async (req, res, next) => {
    try {
      const file = (req.files as UploadedFile[] | undefined)?.[0];
      res.status(201).json(await dataSources.upload(actorOf(req), req.params.activityDefinitionId, file));
    } catch (err) {
      next(err);
    }
  };
  const getDataSource: Controller<'getDataSource'> = async (req, res, next) => {
    try {
      res.status(200).json(await dataSources.get(actorOf(req), req.params.dataSourceId));
    } catch (err) {
      next(err);
    }
  };
  const updateDataSourceLayout: Controller<'updateDataSourceLayout'> = async (req, res, next) => {
    try {
      res.status(200).json(await dataSources.updateLayout(actorOf(req), req.params.dataSourceId, req.body));
    } catch (err) {
      next(err);
    }
  };
  const deleteDataSource: Controller<'deleteDataSource'> = async (req, res, next) => {
    try {
      await dataSources.remove(actorOf(req), req.params.dataSourceId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
  const suggestColumnMapping: Controller<'suggestColumnMapping'> = async (req, res, next) => {
    try {
      res.status(200).json(await dataSources.suggestMapping(actorOf(req), req.params.dataSourceId));
    } catch (err) {
      next(err);
    }
  };
  const importDataSource: Controller<'importDataSource'> = async (req, res, next) => {
    try {
      res.status(202).json(await dataSources.startImport(actorOf(req), req.params.dataSourceId, req.body));
    } catch (err) {
      next(err);
    }
  };
  /** Binary download (not JSON), so the body bypasses typed res.json. */
  const downloadActivityTemplate: Controller<'downloadActivityTemplate'> = async (req, typedRes, next) => {
    const res = typedRes as unknown as Response;
    try {
      if (req.query.format === 'csv') {
        res
          .status(200)
          .type('text/csv')
          .attachment('carbon-glint-activity-template.csv')
          .send(buildActivityTemplateCsv());
        return;
      }
      res
        .status(200)
        .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .attachment('carbon-glint-activity-template.xlsx')
        .send(await buildActivityTemplateXlsx());
    } catch (err) {
      next(err);
    }
  };

  return {
    listGhgCategories,
    createGhgCategory,
    listActivityDefinitions,
    createActivityDefinition,
    getActivityDefinition,
    updateActivityDefinition,
    deleteActivityDefinition,
    publishActivityDefinition,
    listActivities,
    deleteActivities,
    recalculateActivityDefinition,
    uploadDataSource,
    getDataSource,
    updateDataSourceLayout,
    deleteDataSource,
    suggestColumnMapping,
    importDataSource,
    downloadActivityTemplate,
  };
};

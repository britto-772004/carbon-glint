import type { Response } from 'express';
import type { Services } from '../services/index.js';
import type { Controller } from '../openapi/types.js';
import { actorOf } from './http.js';

export const createReportControllers = ({ reports }: Services) => {
  const listReportFormats: Controller<'listReportFormats'> = async (_req, res, next) => {
    try {
      res.status(200).json(reports.formats());
    } catch (err) {
      next(err);
    }
  };
  const listReports: Controller<'listReports'> = async (req, res, next) => {
    try {
      res.status(200).json(await reports.list(actorOf(req)));
    } catch (err) {
      next(err);
    }
  };
  const createReport: Controller<'createReport'> = async (req, res, next) => {
    try {
      res.status(202).json(await reports.create(actorOf(req), req.body));
    } catch (err) {
      next(err);
    }
  };
  const getReport: Controller<'getReport'> = async (req, res, next) => {
    try {
      res.status(200).json(await reports.get(actorOf(req), req.params.reportId));
    } catch (err) {
      next(err);
    }
  };
  const deleteReport: Controller<'deleteReport'> = async (req, res, next) => {
    try {
      await reports.remove(actorOf(req), req.params.reportId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
  /** Streams the PDF (binary; not typed JSON). */
  const downloadReport: Controller<'downloadReport'> = async (req, typedRes, next) => {
    const res = typedRes as unknown as Response;
    try {
      const { stream, fileName } = await reports.download(actorOf(req), req.params.reportId);
      res.status(200).type('application/pdf').attachment(fileName);
      stream.on('error', next).pipe(res);
    } catch (err) {
      next(err);
    }
  };
  return { listReportFormats, listReports, createReport, getReport, deleteReport, downloadReport };
};

import type { Services } from '../services/index.js';
import type { Controller } from '../openapi/types.js';
import { actorOf, setSessionCookie, type ControllerOptions } from './http.js';

export const createTeamControllers = ({ team }: Services, opts: ControllerOptions) => {
  const listUsers: Controller<'listUsers'> = async (req, res, next) => {
    try {
      res.status(200).json(await team.listUsers(actorOf(req)));
    } catch (err) {
      next(err);
    }
  };

  const updateUser: Controller<'updateUser'> = async (req, res, next) => {
    try {
      res.status(200).json(await team.updateUserStatus(actorOf(req), req.params.userId, req.body.status));
    } catch (err) {
      next(err);
    }
  };

  const listInvitations: Controller<'listInvitations'> = async (req, res, next) => {
    try {
      res.status(200).json(await team.listInvitations(actorOf(req)));
    } catch (err) {
      next(err);
    }
  };

  const createInvitation: Controller<'createInvitation'> = async (req, res, next) => {
    try {
      res.status(201).json(await team.invite(actorOf(req), req.body.email));
    } catch (err) {
      next(err);
    }
  };

  const revokeInvitation: Controller<'revokeInvitation'> = async (req, res, next) => {
    try {
      await team.revokeInvitation(actorOf(req), req.params.invitationId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  const resendInvitation: Controller<'resendInvitation'> = async (req, res, next) => {
    try {
      res.status(200).json(await team.resendInvitation(actorOf(req), req.params.invitationId));
    } catch (err) {
      next(err);
    }
  };

  const lookupInvitation: Controller<'lookupInvitation'> = async (req, res, next) => {
    try {
      res.status(200).json(await team.lookupInvitation(req.body.token));
    } catch (err) {
      next(err);
    }
  };

  const acceptInvitation: Controller<'acceptInvitation'> = async (req, res, next) => {
    try {
      const { me, sessionToken } = await team.acceptInvitation(req.body);
      setSessionCookie(res, sessionToken, opts);
      res.status(200).json(me);
    } catch (err) {
      next(err);
    }
  };

  return {
    listUsers,
    updateUser,
    listInvitations,
    createInvitation,
    revokeInvitation,
    resendInvitation,
    lookupInvitation,
    acceptInvitation,
  };
};

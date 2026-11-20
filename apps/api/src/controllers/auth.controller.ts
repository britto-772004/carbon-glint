import type { Services } from '../services/index.js';
import type { Controller } from '../openapi/types.js';
import { actorOf, clearSessionCookie, contextOf, setSessionCookie, type ControllerOptions } from './http.js';

const ACCEPTED_SIGNUP = 'Check your inbox for a verification link.';
const ACCEPTED_GENERIC = 'If an account exists for that email, we have sent it a message.';

export const createAuthControllers = ({ auth }: Services, opts: ControllerOptions) => {
  const signUp: Controller<'signUp'> = async (req, res, next) => {
    try {
      await auth.signUp(req.body, contextOf(req));
      res.status(202).json({ message: ACCEPTED_SIGNUP });
    } catch (err) {
      next(err);
    }
  };

  const verifyEmail: Controller<'verifyEmail'> = async (req, res, next) => {
    try {
      const { me, sessionToken } = await auth.verifyEmail(req.body.token);
      setSessionCookie(res, sessionToken, opts);
      res.status(200).json(me);
    } catch (err) {
      next(err);
    }
  };

  const resendVerification: Controller<'resendVerification'> = async (req, res, next) => {
    try {
      await auth.resendVerification(req.body.email, contextOf(req));
      res.status(202).json({ message: ACCEPTED_GENERIC });
    } catch (err) {
      next(err);
    }
  };

  const logIn: Controller<'logIn'> = async (req, res, next) => {
    try {
      const { me, sessionToken } = await auth.logIn(req.body, contextOf(req));
      setSessionCookie(res, sessionToken, opts);
      res.status(200).json(me);
    } catch (err) {
      next(err);
    }
  };

  /** Public: clears the cookie even if the session is already gone. */
  const logOut: Controller<'logOut'> = async (req, res, next) => {
    try {
      const actor = await auth.authenticate(req.cookies?.cg_session as string | undefined);
      if (actor) await auth.logOut(actor);
      clearSessionCookie(res, opts);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  const forgotPassword: Controller<'forgotPassword'> = async (req, res, next) => {
    try {
      await auth.forgotPassword(req.body.email, contextOf(req));
      res.status(202).json({ message: ACCEPTED_GENERIC });
    } catch (err) {
      next(err);
    }
  };

  const changePassword: Controller<'changePassword'> = async (req, res, next) => {
    try {
      await auth.changePassword(actorOf(req), req.body);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  const getMe: Controller<'getMe'> = async (req, res, next) => {
    try {
      res.status(200).json(await auth.getMe(actorOf(req)));
    } catch (err) {
      next(err);
    }
  };

  return { signUp, verifyEmail, resendVerification, logIn, logOut, forgotPassword, changePassword, getMe };
};

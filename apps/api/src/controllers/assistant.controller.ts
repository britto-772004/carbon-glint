import type { Services } from '../services/index.js';
import type { Controller } from '../openapi/types.js';
import { actorOf } from './http.js';

export const createAssistantControllers = ({ assistant }: Services) => {
  const sendChatMessage: Controller<'sendChatMessage'> = async (req, res, next) => {
    try {
      res.status(200).json(await assistant.chat(actorOf(req), req.body));
    } catch (err) {
      next(err);
    }
  };
  const listConversations: Controller<'listConversations'> = async (req, res, next) => {
    try {
      res.status(200).json(await assistant.conversations(actorOf(req)));
    } catch (err) {
      next(err);
    }
  };
  const listConversationMessages: Controller<'listConversationMessages'> = async (req, res, next) => {
    try {
      res.status(200).json(await assistant.messages(actorOf(req), req.params.conversationId));
    } catch (err) {
      next(err);
    }
  };
  const reindexAssistant: Controller<'reindexAssistant'> = async (req, res, next) => {
    try {
      await assistant.requestReindex(actorOf(req));
      res.status(202).json({ message: 'Re-indexing started.' });
    } catch (err) {
      next(err);
    }
  };
  return { sendChatMessage, listConversations, listConversationMessages, reindexAssistant };
};

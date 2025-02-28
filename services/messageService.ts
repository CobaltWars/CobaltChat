import { getDatabase, ref, push, set, remove, update } from 'firebase/database';
import { app } from './authService';

const database = getDatabase(app);

export type Attachment = {
  name: string;
  type: string;
  url: string;
  size: number;
};

export type Reaction = {
  userId: string;
  username: string;
  emoji: string;
};

export type Message = {
  text: string;
  username: string;
  userId: string;
  timestamp: number;
  attachment?: Attachment;
  reactions?: Record<string, Reaction>;
};

export const sendMessage = async (messageData: Omit<Message, 'reactions'>) => {
  try {
    const messagesRef = ref(database, 'messages');
    return await push(messagesRef, messageData);
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Erreur lors de l\'envoi du message.');
  }
};

export const addReaction = async (messageId: string, userId: string, username: string, emoji: string) => {
  try {
    const reactionRef = ref(database, `messages/${messageId}/reactions/${userId}`);
    return await set(reactionRef, {
      userId,
      username,
      emoji
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw new Error('Erreur lors de l\'ajout de la réaction.');
  }
};

export const removeReaction = async (messageId: string, userId: string) => {
  try {
    const reactionRef = ref(database, `messages/${messageId}/reactions/${userId}`);
    return await remove(reactionRef);
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw new Error('Erreur lors de la suppression de la réaction.');
  }
};

export const deleteMessage = async (messageId: string, userId: string) => {
  try {
    // First check if the message belongs to the user
    const messageRef = ref(database, `messages/${messageId}`);
    update(messageRef, {
      text: "[Message supprimé]",
      deleted: true,
      deletedAt: Date.now()
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw new Error('Erreur lors de la suppression du message.');
  }
};

export default {
  sendMessage,
  addReaction,
  removeReaction,
  deleteMessage
};

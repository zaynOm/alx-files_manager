import { ObjectId } from 'mongodb';
import dbClient from './db';
import redisClient from './redis';

export function basicAuthDecoder(auth) {
  const credentials = auth.split(' ')[1];
  const decodedCredentials = Buffer.from(credentials, 'base64').toString(
    'ascii',
  );
  return decodedCredentials.split(':');
}

export async function getUserByToken(token) {
  if (!token) {
    return null;
  }

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return null;
  }

  const user = await dbClient.findOne('users', { _id: ObjectId(userId) });

  return user;
}

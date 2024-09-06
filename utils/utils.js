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

export async function getUserByToken(res, token) {
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return user;
}

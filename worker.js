import Queue from 'bull';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

export const fileQueue = new Queue('files');
export const userQueue = new Queue('users');

fileQueue.process(async (job) => {
  console.log('Processing thumbnails...');

  try {
    const { fileId, userId } = job.data;
    if (!fileId) {
      throw new Error('Missing fileId');
    }
    if (!userId) {
      throw new Error('Missing userId');
    }
    const file = await dbClient.findOne('files', { _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!file) {
      throw new Error('File not found');
    }
    const widths = [100, 250, 500];
    const thumbnailPromises = widths.map(async (width) => {
      const thumbnail = await imageThumbnail(file.localPath, { width });
      const thumbnailPath = `${file.localPath}_${width}`;
      await fs.promises.writeFile(thumbnailPath, thumbnail);
    });

    return await Promise.all(thumbnailPromises);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
  return null;
});

userQueue.process(async (job) => {
  const { userId } = job.data;
  if (!userId) {
    throw new Error('Missing userId');
  }

  const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
  if (!user) {
    throw new Error('User not found');
  }

  console.log(`Welcome ${user.email}!`);
});

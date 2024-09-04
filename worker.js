import Queue from 'bull';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

export const fileQueue = new Queue('files');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.findOne('files', { _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  try {
    const widths = [100, 250, 500];
    const thumbnailPromises = widths.map(async (width) => {
      const thumbnail = await imageThumbnail(file.localePath, { width });
      const thumbnailPath = `${file.localePath}_${width}`;
      await fs.promises.writeFile(thumbnailPath, thumbnail);
    });

    return await Promise.all(thumbnailPromises);
  } catch (error) {
    return null;
  }
});

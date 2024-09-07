import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import dbClient from '../utils/db';
import { getUserByToken } from '../utils/utils';
import redisClient from '../utils/redis';
import { fileQueue } from '../worker';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('x-token');
    const user = await getUserByToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    const file = await dbClient.findOne('files', { _id: ObjectId(parentId) });
    if (parentId) {
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: !parentId ? '0' : ObjectId(parentId),
    };

    if (type !== 'folder') {
      const localFileName = uuidv4();
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const localPath = path.join(folderPath, localFileName);

      const decodedData = Buffer.from(data, 'base64');

      await fs.promises.mkdir(folderPath, { recursive: true });
      await fs.promises.writeFile(localPath, decodedData);

      newFile.localPath = localPath;
    }

    // spread the new file so the _id doesn't get added to it
    const fileResult = await dbClient.insertOne('files', { ...newFile });

    if (type === 'image') {
      await fileQueue.add({ userId: user._id, fileId: fileResult.insertedId });
    }
    newFile.parentId = newFile.parentId === '0' ? 0 : newFile.parentId;
    delete newFile.localPath;
    return res.status(201).json({ id: fileResult.insertedId, ...newFile });
  }

  static async getShow(req, res) {
    const token = req.header('x-token');
    const { id } = req.params;
    const user = await getUserByToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.findOne('files', { _id: ObjectId(id), userId: user._id });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { _id, localPath, ...fileData } = file;

    return res.json({ id: _id, ...fileData });
  }

  static async getIndex(req, res) {
    const token = req.header('x-token');
    const user = await getUserByToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = 0, page = 0 } = req.query;
    const query = { userId: user._id };
    if (parentId) {
      query.parentId = ObjectId(req.query.parentId);
    }

    const options = { skip: page * 20, limit: 20, fields: { localPath: 0 } };
    const files = await dbClient.find('files', query, options);
    const formatResult = files.map((file) => {
      const { _id, ...rest } = file;
      return { id: _id, ...rest };
    });
    return res.json(formatResult);
  }

  static async toggelPublish(req, res, isPublic) {
    const token = req.header('x-token');
    const { id } = req.params;
    const user = await getUserByToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = { _id: ObjectId(id), userId: user._id };
    const updateDoc = { $set: { isPublic } };
    const options = { returnDocument: 'after' };
    const updatedFile = await dbClient.findOneAndUpdate('files', query, updateDoc, options);
    if (!updatedFile.value) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { _id, localPath, ...fileData } = updatedFile.value;

    return res.status(200).json({ id: _id, ...fileData });
  }

  static async putPublish(req, res) {
    await FilesController.toggelPublish(req, res, true);
  }

  static async putUnpublish(req, res) {
    await FilesController.toggelPublish(req, res, false);
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const size = parseInt(req.query.size, 10);
    const token = req.header('x-token');
    const userId = await redisClient.get(`auth_${token}`);

    const file = await dbClient.findOne('files', { _id: ObjectId(id) });
    if (!file || (!file.isPublic && (!userId || file.userId.toString() !== userId))) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let { localPath } = file;
    if ([500, 250, 100].includes(size)) {
      localPath += `_${size}`;
    }

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name);
    res.set('Content-Type', mimeType);
    return res.sendFile(localPath);
  }
}

export default FilesController;

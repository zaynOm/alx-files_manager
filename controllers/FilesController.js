import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import { getUserByToken } from '../utils/utils';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('x-token');
    const { _id: userId } = await getUserByToken(res, token);
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

    if (parentId) {
      const file = await dbClient.findOne('files', { _id: ObjectId(parentId) });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type !== 'folder') {
      const localFileName = uuidv4();
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const localPath = path.join(folderPath, localFileName);

      const decodedData = Buffer.from(data, 'base64');

      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(localPath, decodedData);

      newFile.localPath = localPath;
    }

    // spread the new file so the _id doesn't get added to it
    const fileResult = await dbClient.insertOne('files', { ...newFile });
    delete newFile.localPath;
    return res.status(201).json({ id: fileResult.insertedId, ...newFile });
  }

  static async getShow(req, res) {
    const token = req.header('x-token');
    const { id } = req.params;
    const { _id: userId } = await getUserByToken(res, token);

    const file = await dbClient.findOne('files', { _id: ObjectId(id), userId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { _id, localPath, ...fileData } = file;

    return res.json({ id: _id, ...fileData });
  }

  static async getIndex(req, res) {
    const token = req.header('x-token');
    const user = await getUserByToken(res, token);

    const { parentId = 0, page = 0 } = req.query;

    const query = { parentId, userId: user._id };
    const options = { skip: page * 20, limit: 20, fields: { localPath: 0 } };
    const files = await dbClient.find('files', query, options);
    return res.json(files);
  }

  static async toggelPublish(req, res, isPublic) {
    const token = req.header('x-token');
    const { id } = req.params;
    const { _id: userId } = await getUserByToken(res, token);

    const query = { _id: ObjectId(id), userId };
    const updateDoc = { $set: { isPublic } };
    const options = { returnDocument: 'after' };
    const updatedFile = await dbClient.findOneAndUpdate('files', query, updateDoc, options);
    const { _id, ...fileData } = updatedFile.value;
    if (!fileData) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json({ id: _id, ...fileData });
  }

  static async putPublish(req, res) {
    await FilesController.toggelPublish(req, res, true);
  }

  static async putUnpublish(req, res) {
    await FilesController.toggelPublish(req, res, false);
  }
}

export default FilesController;

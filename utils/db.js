import { MongoClient } from 'mongodb';

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_port || 27017;
const dbName = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${dbHost}:${dbPort}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(url, {
      useUnifiedTopology: true,
    });
    this.client.connect().then(() => {
      this.db = this.client.db(dbName);
    });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  async find(collection, query, options = {}) {
    return this.db.collection(collection).find(query, options).toArray();
  }

  async findOne(collection, query, options = {}) {
    return this.db.collection(collection).findOne(query, options);
  }

  async insertOne(collection, document) {
    return this.db.collection(collection).insertOne(document);
  }
}

const dbClient = new DBClient();
export default dbClient;

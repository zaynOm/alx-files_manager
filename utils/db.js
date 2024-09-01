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
}

const dbClient = new DBClient();
export default dbClient;

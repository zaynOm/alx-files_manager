import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient().on('error', (err) => {
      console.log('Redis Client Error', err);
    });

    this.AsyncGet = promisify(this.client.get).bind(this.client);
    this.AsyncSet = promisify(this.client.set).bind(this.client);
    this.AsyncDel = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return this.AsyncGet(key);
  }

  async set(key, value, duration) {
    await this.AsyncSet(key, value, 'EX', duration);
  }

  async del(key) {
    await this.AsyncDel(key);
  }
}

const redisClient = RedisClient();

module.exports = redisClient;

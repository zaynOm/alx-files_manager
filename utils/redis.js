import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient().on('error', (err) => {
      console.log(err);
    });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    const AsyncGet = promisify(this.client.get).bind(this.client);
    return AsyncGet(key);
  }

  async set(key, value, duration) {
    const AsyncSet = promisify(this.client.set).bind(this.client);
    await AsyncSet(key, value, 'EX', duration);
  }

  async del(key) {
    const AsyncDel = promisify(this.client.del).bind(this.client);
    await AsyncDel(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;

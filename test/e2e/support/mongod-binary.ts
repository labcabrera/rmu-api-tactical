import { MongoBinary } from 'mongodb-memory-server';

// Downloads mongod once before the e2e files start: in parallel, each file's first MongoMemoryServer would try to
// download it on a cold cache and they fight over the lock file.
export default async function setup(): Promise<void> {
  await MongoBinary.getPath();
}

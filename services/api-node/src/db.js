const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const config = require('./config');

// PostgreSQL Pool Connection
const pgPool = new Pool({
  host: config.PG.host,
  port: config.PG.port,
  user: config.PG.user,
  password: config.PG.password,
  database: config.PG.database,
  max: 20, // Max connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pgPool.on('connect', () => {
  console.log('PostgreSQL client pool connected.');
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// MongoDB Client Connection
const mongoClient = new MongoClient(config.MONGO_URI);
let mongoDb = null;

async function connectMongo() {
  if (mongoDb) return mongoDb;
  try {
    await mongoClient.connect();
    console.log('Connected to MongoDB server.');
    mongoDb = mongoClient.db();
    return mongoDb;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

function getMongoDb() {
  if (!mongoDb) {
    throw new Error('MongoDB client is not connected. Call connectMongo first.');
  }
  return mongoDb;
}

module.exports = {
  pgPool,
  connectMongo,
  getMongoDb,
  mongoClient
};

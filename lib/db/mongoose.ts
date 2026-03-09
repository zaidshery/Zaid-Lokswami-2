import mongoose from 'mongoose';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastConnectedDb: string | null;
};

type MongoErrorWithDetails = Error & {
  code?: string;
  errno?: number;
  syscall?: string;
  hostname?: string;
  cause?: unknown;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI?.trim() || '';

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached =
  globalForMongoose.mongooseCache ?? {
    conn: null,
    promise: null,
    lastConnectedDb: null,
  };

if (!globalForMongoose.mongooseCache) {
  globalForMongoose.mongooseCache = cached;
}

if (!MONGODB_URI) {
  console.warn(
    '[MongoDB] MONGODB_URI is not set. Database-backed routes will fail until it is configured.'
  );
}

function getMongoErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return String(error);
}

function getMongoErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const mongoError = error as MongoErrorWithDetails;

  return {
    name: mongoError.name,
    message: mongoError.message,
    code: mongoError.code,
    errno: mongoError.errno,
    syscall: mongoError.syscall,
    hostname: mongoError.hostname,
    cause:
      mongoError.cause instanceof Error
        ? mongoError.cause.message
        : mongoError.cause,
  };
}

function logMongoConnectionSuccess(connection: typeof mongoose) {
  const databaseName =
    connection.connection.db?.databaseName ||
    connection.connection.name ||
    'unknown';

  if (cached.lastConnectedDb !== databaseName) {
    console.info(`[MongoDB] Connected successfully to database "${databaseName}".`);
    cached.lastConnectedDb = databaseName;
  }
}

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set.');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    cached.conn = await cached.promise;
    logMongoConnectionSuccess(cached.conn);
    return cached.conn;
  } catch (error) {
    const errorMessage = getMongoErrorMessage(error);

    console.error(`[MongoDB] Connection failed: ${errorMessage}`, getMongoErrorDetails(error));

    cached.promise = null;
    cached.conn = null;
    throw new Error(errorMessage);
  }
}

export default connectDB;

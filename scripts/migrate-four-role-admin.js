#!/usr/bin/env node

const path = require('node:path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

const LEGACY_ROLE_MAP = {
  author: 'reporter',
  editor: 'copy_editor',
  viewer: 'reader',
};

function getProjectRoot() {
  return path.resolve(__dirname, '..');
}

function loadEnv() {
  const projectRoot = getProjectRoot();
  dotenv.config({ path: path.join(projectRoot, '.env.local'), override: false });
  dotenv.config({ path: path.join(projectRoot, '.env'), override: false });
}

function hasWriteFlag() {
  return process.argv.includes('--write');
}

async function main() {
  loadEnv();

  const mongoUri = (process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured. This migration needs MongoDB.');
  }

  const write = hasWriteFlag();
  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  await client.connect();

  try {
    const db = client.db();
    const users = db.collection('users');
    const legacyRoles = Object.keys(LEGACY_ROLE_MAP);

    const counts = await Promise.all(
      legacyRoles.map(async (legacyRole) => ({
        legacyRole,
        targetRole: LEGACY_ROLE_MAP[legacyRole],
        count: await users.countDocuments({ role: legacyRole }),
      }))
    );

    const totalLegacyUsers = counts.reduce((sum, entry) => sum + entry.count, 0);

    console.log('\nFour-role newsroom admin migration');
    console.log(write ? 'Mode: WRITE\n' : 'Mode: DRY RUN\n');

    for (const entry of counts) {
      console.log(`${entry.legacyRole} -> ${entry.targetRole}: ${entry.count} user(s)`);
    }

    console.log(`\nTotal legacy-role users: ${totalLegacyUsers}`);

    if (!write) {
      console.log('\nNo changes were written. Re-run with --write to apply the migration.');
      return;
    }

    let updatedCount = 0;

    for (const legacyRole of legacyRoles) {
      const result = await users.updateMany(
        { role: legacyRole },
        {
          $set: {
            role: LEGACY_ROLE_MAP[legacyRole],
            updatedAt: new Date(),
          },
        }
      );
      updatedCount += result.modifiedCount;
    }

    console.log(`\nMigration complete. Updated ${updatedCount} user(s).`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nMigration failed: ${message}`);
  process.exit(1);
});

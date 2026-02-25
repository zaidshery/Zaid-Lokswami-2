#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n🔐 Bcrypt Password Hash Generator for Lokswami Admin\n');

  const password = await askQuestion('Enter password: ');

  if (!password) {
    console.log('❌ Password cannot be empty');
    rl.close();
    process.exit(1);
  }

  try {
    console.log('\n⏳ Generating bcrypt hash (this may take a few seconds)...\n');
    const hash = await bcrypt.hash(password, 10);

    console.log('✅ Hash generated successfully!\n');
    console.log('Add this to your .env.local file:\n');
    console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
    console.log('Keep your password safe. You will need it to log in.\n');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating hash:', error);
    rl.close();
    process.exit(1);
  }
}

main();

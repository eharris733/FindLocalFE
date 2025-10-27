const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Read values from .env
const TEAM_ID = process.env.TEAM_ID;
const KEY_ID = process.env.KEY_ID;
const CLIENT_ID = process.env.APPLE_APP_ID;
const P8_FILE_PATH = process.env.P8_FILE_PATH || process.argv[2]; // Can pass file path as argument

if (!TEAM_ID || !KEY_ID || !CLIENT_ID) {
  console.error('Error: Missing required environment variables');
  console.error('Please ensure TEAM_ID, KEY_ID, and APPLE_APP_ID are set in .env');
  process.exit(1);
}

// Try to read the private key from the .p8 file or from .env
let privateKey;

if (P8_FILE_PATH) {
  // Option 1: Read from .p8 file
  const absolutePath = path.isAbsolute(P8_FILE_PATH) 
    ? P8_FILE_PATH 
    : path.join(__dirname, '..', P8_FILE_PATH);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: .p8 file not found at ${absolutePath}`);
    console.error('\nUsage:');
    console.error('  node scripts/generate-apple-secret.js path/to/AuthKey_XXXXX.p8');
    console.error('  or set P8_FILE_PATH in .env');
    process.exit(1);
  }
  
  privateKey = fs.readFileSync(absolutePath, 'utf8');
  console.log('✓ Using .p8 file from:', absolutePath);
} else if (process.env.p8_private_key) {
  // Option 2: Read from .env (must be complete PEM format)
  let keyContent = process.env.p8_private_key;
  
  // If the key doesn't have headers, add them
  if (!keyContent.includes('BEGIN PRIVATE KEY')) {
    keyContent = `-----BEGIN PRIVATE KEY-----\n${keyContent}\n-----END PRIVATE KEY-----`;
  }
  
  privateKey = keyContent;
  console.log('✓ Using private key from .env');
} else {
  console.error('Error: No private key found');
  console.error('\nPlease either:');
  console.error('  1. Run: node scripts/generate-apple-secret.js path/to/AuthKey_XXXXX.p8');
  console.error('  2. Set P8_FILE_PATH in .env to point to your .p8 file');
  console.error('  3. Set p8_private_key in .env with the complete private key content');
  process.exit(1);
}

const token = jwt.sign(
  {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000, // 6 months
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: KEY_ID,
  }
);

console.log('Apple Client Secret:');
console.log(token);
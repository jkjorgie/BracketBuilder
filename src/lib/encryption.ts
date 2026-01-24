import crypto from 'crypto';

// Get encryption key from environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set');
}

// Derive a 32-byte key from the environment variable
const KEY = crypto
  .createHash('sha256')
  .update(ENCRYPTION_KEY)
  .digest();

/**
 * Encrypts a string value
 * @param text - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (hex encoded)
 */
export function encrypt(text: string): string {
  // Generate a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the auth tag
  const authTag = cipher.getAuthTag();
  
  // Return iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string
 * @param encryptedText - The encrypted text in format: iv:authTag:encryptedData
 * @returns Decrypted string
 */
export function decrypt(encryptedText: string): string {
  // Split the encrypted text into its components
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt the text
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Safely decrypt with error handling
 * @param encryptedText - The encrypted text
 * @returns Decrypted string or null if decryption fails
 */
export function safeDecrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) {
    return null;
  }
  
  try {
    return decrypt(encryptedText);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

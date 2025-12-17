import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY) {
  console.warn('Warning: ENCRYPTION_KEY not set. Using default key (not secure!)');
}

/**
 * Encrypts sensitive data using AES-256
 * @param data - Plain text data to encrypt
 * @returns Encrypted string
 */
export function encryptData(data: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY);
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts encrypted data
 * @param encryptedData - Encrypted string
 * @returns Decrypted plain text
 */
export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption resulted in empty string');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hashes sensitive data using SHA-256 (one-way)
 * @param data - Data to hash
 * @returns Hashed string
 */
export function hashData(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

/**
 * Alias for encryptData - for backward compatibility
 */
export function encrypt(data: string, key?: string): string {
  return encryptData(data);
}

/**
 * Alias for decryptData - for backward compatibility
 */
export function decrypt(encryptedData: string, key?: string): string {
  return decryptData(encryptedData);
}

/**
 * Generates a random encryption key
 * @param length - Key length (default: 32)
 * @returns Random key
 */
export function generateEncryptionKey(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let key = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    key += charset[randomIndex];
  }
  
  return key;
}

/**
 * Validates encryption key strength
 * @param key - Key to validate
 * @returns True if key is strong enough
 */
export function validateEncryptionKey(key: string): boolean {
  if (key.length < 32) return false;
  
  const hasUpperCase = /[A-Z]/.test(key);
  const hasLowerCase = /[a-z]/.test(key);
  const hasNumbers = /\d/.test(key);
  const hasSpecialChar = /[!@#$%^&*]/.test(key);
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

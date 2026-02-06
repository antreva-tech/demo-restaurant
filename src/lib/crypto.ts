/**
 * Server-only encryption for sensitive config (e.g. payment integration secrets).
 * AES-256-GCM with key from ENCRYPTION_KEY (64 hex chars = 32 bytes).
 * Format: base64(iv:ciphertext:authTag)
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw || raw.length !== 64 || !/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error(
      "[crypto] ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate: openssl rand -hex 32"
    );
  }
  return Buffer.from(raw, "hex");
}

/**
 * Encrypts a JSON-serializable object. Returns base64 string "iv:ciphertext:tag".
 */
export function encryptJson(obj: object): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const json = JSON.stringify(obj);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, enc, tag]);
  return combined.toString("base64");
}

/**
 * Decrypts a string produced by encryptJson. Returns parsed object.
 */
export function decryptJson<T>(cipher: string): T {
  const key = getKey();
  const combined = Buffer.from(cipher, "base64");
  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("[crypto] Invalid cipher text");
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const enc = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  const json = decipher.update(enc) + decipher.final("utf8");
  return JSON.parse(json) as T;
}

import { adjectives, nouns } from './word-lists';

export function generateRandomUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  return `${adjective}${noun}${number}`;
}

export function getRandomAvatarUrl(): string {
  // Using DiceBear's pixel-art avatars with PNG format instead of SVG
  const randomSeed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/7.x/pixel-art/png?seed=${randomSeed}&backgroundColor=7c3aed`;
}
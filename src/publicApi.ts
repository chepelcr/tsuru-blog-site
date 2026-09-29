import { AwsClient } from 'aws4fetch';
import type { BlogChrome, BlogList, BlogPost } from './types';

const base = (import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/+$/, '');
const pool = import.meta.env.VITE_PUBLIC_IDENTITY_POOL_ID || '';
const region = import.meta.env.VITE_AWS_REGION || pool.split(':')[0];
let identityId: string | undefined;
let credentials: { accessKeyId: string; secretAccessKey: string; sessionToken: string; expiration: number } | undefined;

async function identityCall<T>(target: string, body: unknown): Promise<T> {
  const response = await fetch(`https://cognito-identity.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': `AWSCognitoIdentityService.${target}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Guest credentials failed (${response.status})`);
  return response.json() as Promise<T>;
}

async function guest() {
  if (credentials && credentials.expiration > Date.now() + 60_000) return credentials;
  identityId ||= (await identityCall<{ IdentityId: string }>('GetId', { IdentityPoolId: pool })).IdentityId;
  const result = await identityCall<{ Credentials: { AccessKeyId: string; SecretKey: string; SessionToken: string; Expiration: number } }>(
    'GetCredentialsForIdentity', { IdentityId: identityId });
  credentials = { accessKeyId: result.Credentials.AccessKeyId, secretAccessKey: result.Credentials.SecretKey,
    sessionToken: result.Credentials.SessionToken, expiration: result.Credentials.Expiration * 1000 };
  return credentials;
}

async function get<T>(path: string): Promise<T> {
  if (!base || !pool || !region) throw new Error('Public blog API is not configured');
  const aws = new AwsClient({ ...await guest(), service: 'execute-api', region });
  const response = await aws.fetch(`${base}${path}`, { method: 'GET' });
  if (!response.ok) throw new PublicApiError(response.status);
  return response.json() as Promise<T>;
}

export class PublicApiError extends Error {
  constructor(public status: number) { super(`Public blog API returned ${status}`); }
}

export const publicApi = {
  list: async () => {
    const posts: BlogPost[] = [];
    for (let page = 1; page <= 100; page++) {
      const batch = await get<BlogList>(`/api/public/blog/posts?page=${page}&page_size=50`);
      posts.push(...batch.data);
      if (batch.data.length < 50) return posts;
    }
    throw new Error('Blog listing exceeds the supported page count');
  },
  article: (slug: string) => get<BlogPost>(`/api/public/blog/posts/${encodeURIComponent(slug)}`),
  chrome: async () => (await get<{ data: BlogChrome }>('/api/public/content/landing/blog-chrome')).data,
};

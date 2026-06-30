if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not set. Add it to your .env.local (see .env.example).');
}
if (!process.env.NEXT_PUBLIC_MEDIA_URL) {
  throw new Error('NEXT_PUBLIC_MEDIA_URL is not set. Add it to your .env.local (see .env.example).');
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
export const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_URL;

export function mediaUrl(path: string): string {
  return `${MEDIA_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const CACHE_TTL = 10 * 60 * 1000;
const apiCache = new Map<string, { data: any; expiry: number }>();

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta: Record<string, unknown> | null;
  error?: { message: string; details?: unknown; requestId?: string };
}

export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

let accessToken: string | null = null;
let pendingRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        accessToken = null;
        return null;
      }
      const data = await response.json();
      accessToken = data.accessToken;
      return data.accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

function buildQueryString(query?: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function fetchWithAuth<T>(path: string, options: RequestOptions, token: string | null): Promise<T> {
  const { method = 'GET', body, query, skipAuth } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}${buildQueryString(query)}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let result: any;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiRequestError(`Invalid JSON response (${response.status})`, response.status);
  }

  if (!response.ok) {
    throw new ApiRequestError(result?.message || `Request failed (${response.status})`, response.status);
  }

  return result;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query } = options;

  const cacheKey = `${path}${buildQueryString(query)}`;
  if (method === 'GET') {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T;
    }
  }

  try {
    const result = await fetchWithAuth<T>(path, options, accessToken);
    if (method === 'GET') {
      apiCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
    }
    return result;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401 && accessToken && !options.skipAuth) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        const result = await fetchWithAuth<T>(path, options, newToken);
        if (method === 'GET') {
          apiCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
        }
        return result;
      }
    }
    throw err;
  }
}

export function clearApiCache() {
  apiCache.clear();
}

async function uploadToMediaServer(
  path: string,
  field: string,
  file: File,
  ticket?: string
): Promise<{ url: string; path?: string; message?: string }> {
  const formData = new FormData();
  formData.append(field, file);

  const response = await fetch(`${MEDIA_BASE_URL}${path}`, {
    method: 'POST',
    headers: ticket ? { Authorization: `Bearer ${ticket}` } : undefined,
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new ApiRequestError(result.message || 'Media upload failed', response.status);
  }
  return result;
}

// Shared types matching backend Trip model
export interface TripStep {
  id: string;
  day: string;
  title: string;
  description: string;
  image: string;
  order: number;
}

export interface Trip {
  id: string;
  slug: string;
  country: string;
  label: string | null;
  bannerImage: string;
  bannerOrder: number;
  showInBanner: boolean;
  description: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  statTravelers: string;
  statTours: string;
  statStays: string;
  title: string;
  location: string;
  longDescription: string | null;
  includedFeatures: string[];
  pricePerPerson: number;
  currency: string;
  defaultCheckIn: string | null;
  defaultCheckOut: string | null;
  published: boolean;
  status: string;
  steps: TripStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  profilePic: string | null;
  phoneNumber: string;
  email: string | null;
}

export interface TokenPair {
  user: AuthUser;
  accessToken: string;
}

export interface Booking {
  id: string;
  userId: string;
  tripId: string;
  trip?: Trip;
  payment?: any;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number | null;
  status: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  images: string[];
  status: string;
  hostId: string;
  host?: any;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  screenshotUrl: string;
  transactionNumber: string;
  amountFoundInPic: number;
  transferDateTime: string;
  method: string;
  status: string;
  booking?: Booking;
}

// Public & Guest endpoints
export const publicApi = {
  health: () => request<{ ok: boolean }>('/health', { skipAuth: true }),

  requestIdVerificationTicket: () =>
    request<{ ticket: string }>('/api/public/verification-ticket', { method: 'POST', skipAuth: true }),

  register: (input: {
    username: string; phoneNumber: string; fullName: string;
    email?: string; password: string; nationalIdNumber: string;
    nationalIdPicFront: string; nationalIdPicBack: string;
    dateOfBirth: string; role?: 'OWNER' | 'CUSTOMER';
  }) => request<TokenPair>('/api/auth/register', { method: 'POST', body: input, skipAuth: true }),

  login: (input: { identifier: string; password: string }) =>
    request<TokenPair>('/api/auth/login', { method: 'POST', body: input, skipAuth: true }),

  refresh: () => request<{ accessToken: string; user: AuthUser }>('/api/auth/refresh', { method: 'POST', skipAuth: true }),

  getBannerSlides: (locale?: string) => request<Trip[]>('/api/public/trips/banner', { skipAuth: true, query: locale ? { locale } : undefined }),

  listTrips: (locale?: string) => request<Trip[]>('/api/public/trips', { skipAuth: true, query: locale ? { locale } : undefined }),

  getTripBySlug: (slug: string, locale?: string) => request<Trip>(`/api/public/trips/${slug}`, { skipAuth: true, query: locale ? { locale } : undefined }),

  listListings: () => request<Listing[]>('/api/listings', { skipAuth: true }),

  getSettings: () => request<{ payment: { instapayHandle: string; ewalletNumber: string; currency: string } }>('/api/public/settings', { skipAuth: true }),
};

// Authenticated user endpoints
export const authApi = {
  me: () => request<AuthUser>('/api/auth/me'),

  updateMe: (input: { fullName?: string; email?: string; profilePic?: string }) =>
    request<AuthUser>('/api/auth/me', { method: 'PATCH', body: input }),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
};

export const bookingsApi = {
  create: (input: { tripId: string; checkIn: string; checkOut: string; guests?: number }) =>
    request<Booking>('/api/bookings', { method: 'POST', body: input }),

  mine: () => request<Booking[]>('/api/bookings'),

  get: (id: string) => request<Booking>(`/api/bookings/${id}`),
};

export const paymentsApi = {
  submitProof: (input: {
    bookingId: string; screenshotUrl: string; transactionNumber: string;
    amountFoundInPic: number; transferDateTime: string; method?: string;
  }) => request<Payment>('/api/payments/proof', { method: 'POST', body: input }),
};

async function uploadToBackend(path: string, file: File, ticket?: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (ticket) formData.append('ticket', ticket);

  let token = accessToken;
  if (!token) {
    token = await refreshAccessToken();
  }

  const doUpload = async (tok: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (tok) headers.Authorization = `Bearer ${tok}`;
    return fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  };

  let response = await doUpload(token);

  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) response = await doUpload(newToken);
  }

  const result = await response.json();
  if (!response.ok) throw new ApiRequestError(result.message || 'Upload failed', response.status);
  return result;
}

export const mediaApi = {
  uploadHeroMedia: (file: File, ticket?: string) => uploadToMediaServer('/api/upload-hero-media', 'media', file, ticket),
  uploadStory: (file: File, ticket?: string) => uploadToMediaServer('/api/upload-story', 'media', file, ticket),
  uploadProductImage: (file: File, ticket?: string) => uploadToBackend('/api/media/product-image', file, ticket),
  uploadIdPhoto: (file: File, ticket?: string) => uploadToBackend('/api/media/id-photo', file, ticket),
  deleteMedia: (filePath: string, key?: string) =>
    fetch(`${MEDIA_BASE_URL}/api/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'x-media-key': key } : {}) },
      body: JSON.stringify({ filePath }),
    }).then((res) => res.json()),
};

export const listingsApi = {
  list: () => request<Listing[]>('/api/listings', { skipAuth: true }),
  mine: () => request<Listing[]>('/api/listings/mine'),
  create: (data: { title: string; location: string; description: string; price: number; images?: string[] }) =>
    request<Listing>('/api/listings', { method: 'POST', body: data }),
};

export const adminApi = {
  getStats: () =>
    request<{
      totalUsers: number; totalTrips: number; publishedTrips: number;
      totalBookings: number; pendingPayments: number; pendingListings: number;
      confirmedRevenue: number;
    }>('/api/admin/stats'),

  listTrips: () => request<Trip[]>('/api/admin/trips'),
  createTrip: (data: any) => request<Trip>('/api/admin/trips', { method: 'POST', body: data }),
  updateTrip: (id: string, data: any) => request<Trip>(`/api/admin/trips/${id}`, { method: 'PATCH', body: data }),
  replaceTripSteps: (id: string, steps: any[]) =>
    request<Trip>(`/api/admin/trips/${id}/steps`, { method: 'PUT', body: { steps } }),
  deleteTrip: (id: string) => request<void>(`/api/admin/trips/${id}`, { method: 'DELETE' }),

  listPayments: (status?: string) =>
    request<any[]>(`/api/admin/payments${status ? `?status=${status}` : ''}`),
  reviewPayment: (id: string, status: 'VERIFIED' | 'REJECTED') =>
    request<any>(`/api/admin/payments/${id}`, { method: 'PATCH', body: { status } }),

  listBookings: (status?: string) =>
    request<any[]>(`/api/admin/bookings${status ? `?status=${status}` : ''}`),
  getBooking: (id: string) => request<any>(`/api/admin/bookings/${id}`),
  updateBooking: (id: string, data: any) => request<any>(`/api/admin/bookings/${id}`, { method: 'PATCH', body: data }),
  deleteBooking: (id: string) => request<void>(`/api/admin/bookings/${id}`, { method: 'DELETE' }),

  listListings: (status?: string) =>
    request<any[]>(`/api/admin/listings${status ? `?status=${status}` : ''}`),
  updateListing: (id: string, data: any) => request<any>(`/api/admin/listings/${id}`, { method: 'PATCH', body: data }),
  deleteListing: (id: string) => request<void>(`/api/admin/listings/${id}`, { method: 'DELETE' }),

  listUsers: (params?: { role?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.q) qs.set('q', params.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<any[]>(`/api/admin/users${suffix}`);
  },
  getUser: (id: string) => request<any>(`/api/admin/users/${id}`),
  updateUser: (id: string, data: any) => request<any>(`/api/admin/users/${id}`, { method: 'PATCH', body: data }),
  deleteUser: (id: string) => request<void>(`/api/admin/users/${id}`, { method: 'DELETE' }),
};

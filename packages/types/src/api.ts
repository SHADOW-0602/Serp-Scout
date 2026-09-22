export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface WorkspaceDto {
  id: string;
  name: string;
  ownerId: string;
  timezone: string;
  createdAt: string;
}

export interface BusinessDto {
  id: string;
  workspaceId: string;
  name: string;
  websiteUrl: string;
  industry?: string;
  description?: string;
  country?: string;
  city?: string;
  serviceArea?: string;
  primaryGoal?: string;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorDto {
  id: string;
  businessId: string;
  name: string;
  domain: string;
  websiteUrl: string;
  mapsUrl?: string;
  category?: string;
  competitorType: string;
  confidenceScore: number;
  status: 'candidate' | 'confirmed' | 'rejected' | 'indirect';
  userNotes?: string;
}

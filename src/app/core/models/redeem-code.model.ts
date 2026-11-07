export type RedeemCodeStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'RECALLED';

export interface RedeemCodeItemDto {
  id: string;
  code: string;
  points: number;
  value: number;
  userId: string;
  status: RedeemCodeStatus;
  createdAt: string;
  expiresAt?: string;
}

export interface RedeemCodesResponse {
  totalCount: number;
  codes: RedeemCodeItemDto[];
}

export interface AdminOffersResponse {
  summary: OffersSummary;
  totalCount: number;
  offers: OfferItemDto[];
}

export interface OffersSummary {
  totalOffers: number;
  addedToday: number;
  active: number;
  hidden: number;
}

export interface OfferItemDto {
  offerId: string;
  shortId: string;
  name: string;
  logoUrl: string;
  source: string;
  payout: number;
  epc: number;
  publishersCount: number;
  status: string; // "ACTIVE" | "HIDDEN"
}

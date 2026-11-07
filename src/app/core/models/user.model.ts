export interface UserProfileDto {
  id: string;
  displayId: string;
  partnerName: string;
  status: string;
  currentBalance: number;
  publisherUserId: string;
}

export interface UserStatsDto {
  totalOffersCompleted: number;
  totalPointsEarned: number;
  totalRedemptions: number;
}

export interface UserProfileResponse {
  user: UserProfileDto;
  stats: UserStatsDto;
}

export interface ActivityItemDto {
  timestamp: string;
  eventType: string;
  details: string;
  pointsChange: number;
  status: string;
}

export interface ActivityLogResponse {
  totalCount: number;
  activities: ActivityItemDto[];
}

export interface SupportTicketItemDto {
  ticketId: string;
  displayTicketId: string;
  userId: string;
  displayUserId: string;
  subject: string;
  category: string;
  submittedDate: string;
  status: string;
}

export interface SupportTicketsResponse {
  totalCount: number;
  tickets: SupportTicketItemDto[];
}

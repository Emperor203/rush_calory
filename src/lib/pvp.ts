export interface PvpBattle {
  id: string;
  challenger: {
    id: string;
    name: string;
    avatar: string;
    currentKm: number;
    currentKcal: number;
  };
  opponent: {
    id: string;
    name: string;
    avatar: string;
    currentKm: number;
    currentKcal: number;
  };
  targetKm: number;
  status: 'pending' | 'active' | 'finished';
  winnerId?: string;
  startedAt?: string;
}

export interface PvpInvitePayload {
  battleId: string;
  fromUser: {
    id: string;
    name: string;
    avatar: string;
  };
  toUserId: string;
  targetKm: number;
}

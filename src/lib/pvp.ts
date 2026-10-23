export interface PvpRoomRunner {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  currentKm: number;
  currentKcal: number;
}

export interface PvpRoom {
  roomCode: string;
  host: PvpRoomRunner;
  guest?: PvpRoomRunner | null;
  targetKm: number;
  status: 'waiting' | 'ready' | 'countdown' | 'racing' | 'finished';
  createdAt: number;
}

export interface PvpBattle {
  id: string;
  roomCode?: string;
  challenger: PvpRoomRunner;
  opponent: PvpRoomRunner;
  targetKm: number;
  status: 'pending' | 'countdown' | 'active' | 'finished';
  winnerId?: string;
  winReason?: 'target_reached' | 'surrender';
  startedAt?: string;
}

export interface PvpInvitePayload {
  battleId: string;
  roomCode?: string;
  fromUser: {
    id: string;
    name: string;
    avatar: string;
    email?: string;
  };
  toUserId: string;
  toUserEmail?: string;
  targetKm: number;
}

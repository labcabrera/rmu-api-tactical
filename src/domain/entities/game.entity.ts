export interface Game {
  id?: string;
  user: string;
  name: string;
  description?: string | undefined;
  status: 'created' | 'in-progress' | 'finished';
  factions: string[];
  round: number;
  createdAt?: Date;
  updatedAt?: Date;
}

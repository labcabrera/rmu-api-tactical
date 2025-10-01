export interface NpcPort {
  findById: (id: string) => Promise<Npc | undefined>;
}

export interface Npc {
  id: string;
  realmId: string;
  name: string;
}

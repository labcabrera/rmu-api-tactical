export interface NpcPort {
  findById: (id: string) => Promise<Npc | undefined>;
}

export const NPC_PORT = Symbol('NpcPort');

export interface Npc {
  id: string;
  realmId: string;
  name: string;
}

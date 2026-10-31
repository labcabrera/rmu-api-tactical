/** Reads the realms of rmu-api-core with the service token: whether a realm is generic (spec 055, decision 6). */
export interface RealmPort {
  findById: (id: string) => Promise<Realm | null>;
}

export const REALM_PORT = Symbol('RealmPort');

export interface Realm {
  id: string;
  name: string;
  /** The NPCs of a generic realm (RMU Core) play in any campaign. Missing in core versions before spec 055: false. */
  generic?: boolean;
}

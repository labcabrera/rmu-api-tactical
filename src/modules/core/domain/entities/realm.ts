export interface Realm {
  id: string;
  name: string;
  description?: string;
  owner: string;
  createdAt?: Date;
  updatedAt?: Date;
}

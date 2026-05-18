import { Fumble } from '../../domain/value-objects/action-attack.vo';

export interface FumbleTableLookupRequest {
  fumbleTable: string;
  roll: number;
}

export interface FumbleTablePort {
  lookup(request: FumbleTableLookupRequest): Promise<Fumble>;
}

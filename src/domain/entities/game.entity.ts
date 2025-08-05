import { AccessControlledEntity } from './access-controlled-entity';
import { HasEntityMetadata } from './has-entity-metadata';

export interface Game extends AccessControlledEntity, HasEntityMetadata{
  id?: string;
  name: string;
  description?: string | undefined;
  status: 'created' | 'in_progress' | 'finished';
  phase: 'not_started' | 'declare_actions' | 'declare_initative' | 'resolve_actions' | 'upkeep';
  factions: string[];
  round: number;
}

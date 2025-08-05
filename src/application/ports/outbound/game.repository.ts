import { Game } from '@domain/entities/game.entity';
import { Repository } from './repository';

export interface GameRepository extends Repository<Game> {}

import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../../../shared/domain/errors';
import { Character, Stat } from '../../../entities/character.entity';

@Injectable()
export class StatProcessor {
  process(character: Partial<Character>): void {
    if (!character.statistics) {
      return;
    }
    this.processStat(character.statistics.ag);
    this.processStat(character.statistics.co);
    this.processStat(character.statistics.em);
    this.processStat(character.statistics.in);
    this.processStat(character.statistics.me);
    this.processStat(character.statistics.pr);
    this.processStat(character.statistics.qu);
    this.processStat(character.statistics.re);
    this.processStat(character.statistics.sd);
    this.processStat(character.statistics.st);
  }

  private processStat(stat: Stat): void {
    const bonus = this.getBonus(stat.temporary);
    stat.bonus = bonus;
    stat.totalBonus = bonus + stat.racial + stat.custom;
  }

  private getBonus(temporary: number | undefined): number {
    if (!temporary) {
      return 0;
    }
    switch (temporary) {
      case 1:
        return -15;
      case 2:
        return -14;
      case 3:
        return -13;
      case 4:
        return -12;
      case 5:
        return -11;
      case 6:
        return -10;
      case 7:
      case 8:
        return -9;
      case 9:
      case 10:
      case 11:
        return -8;
      case 12:
      case 13:
      case 14:
        return -7;
      case 15:
      case 16:
      case 17:
        return -6;
      case 18:
      case 19:
      case 20:
      case 21:
      case 22:
      case 23:
        return -5;
      case 24:
      case 25:
      case 26:
      case 27:
      case 28:
      case 29:
        return -4;
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
      case 35:
        return -3;
      case 36:
      case 37:
      case 38:
      case 39:
      case 40:
      case 41:
        return -2;
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
        return -1;
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
        return 0;
      case 54:
      case 55:
      case 56:
      case 57:
      case 58:
      case 59:
        return 1;
      case 60:
      case 61:
      case 62:
      case 63:
      case 64:
      case 65:
        return 2;
      case 66:
      case 67:
      case 68:
      case 69:
      case 70:
      case 71:
        return 3;
      case 72:
      case 73:
      case 74:
      case 75:
      case 76:
      case 77:
        return 4;
      case 78:
      case 79:
      case 80:
      case 81:
      case 82:
      case 83:
        return 5;
      case 84:
      case 85:
      case 86:
        return 6;
      case 87:
      case 88:
      case 89:
        return 7;
      case 90:
      case 91:
      case 92:
        return 8;
      case 93:
      case 94:
        return 9;
      case 95:
        return 10;
      case 96:
        return 11;
      case 97:
        return 12;
      case 98:
        return 13;
      case 99:
        return 14;
      case 100:
        return 15;
      default:
        throw new ValidationError('Invalid temporary value');
    }
  }
}

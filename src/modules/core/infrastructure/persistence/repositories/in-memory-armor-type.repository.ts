import { Injectable } from '@nestjs/common';
import { ArmorTypeRepository } from 'src/modules/core/application/ports/outbound/armor-type-repository';
import { ARMOR_TYPES, ArmorType } from 'src/modules/core/domain/entities/armor-type';

@Injectable()
export class InMemoryArmorTypeRepository implements ArmorTypeRepository {
  findById(id: number): ArmorType | null {
    const armorType = ARMOR_TYPES.find((at) => at.id === id);
    return armorType || null;
  }

  find(): ArmorType[] {
    return ARMOR_TYPES;
  }
}

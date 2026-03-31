import { ApiProperty } from '@nestjs/swagger';

export class ActorRoundFactionDto {
  @ApiProperty({ description: 'Faction id' })
  id: string;

  @ApiProperty({ description: 'Faction name' })
  name: string;

  static fromEntity(entity: any): ActorRoundFactionDto {
    const dto = new ActorRoundFactionDto();
    dto.id = entity.id;
    dto.name = entity.name;
    return dto;
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CharacterInfoDto {
  @ApiProperty({ description: 'Character age', example: 30 })
  @IsNumber()
  @IsNotEmpty()
  level: number;

  @ApiProperty({ description: 'Character gender', example: 'Male' })
  @IsString()
  @IsNotEmpty()
  race: string;

  @ApiProperty({ description: 'Character backstory', example: 'A brave warrior from Gondor.' })
  @IsString()
  @IsNotEmpty()
  sizeId: string;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  height: number;

  @ApiProperty({ description: 'Character size', example: 'Medium' })
  @IsNumber()
  @IsNotEmpty()
  weight: number;
}

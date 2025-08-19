/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Character, CharacterStatistics } from '../src/modules/characters/domain/entities/character.entity';
import { CharacterProcessorService } from '../src/modules/characters/domain/services/character-processor.service';

describe('CharacterProcessorService', () => {
  let service: CharacterProcessorService;
  let statProcessor: { process: jest.Mock };
  let movementProcessor: { process: jest.Mock };
  let initiativeProcessor: { process: jest.Mock };
  let skillProcessor: { process: jest.Mock };
  let attackProcessor: { process: jest.Mock };
  let equipmentProcessor: { process: jest.Mock };
  let hPProcessor: { process: jest.Mock };
  let defenseProcessor: { process: jest.Mock };

  beforeEach(() => {
    statProcessor = { process: jest.fn() };
    movementProcessor = { process: jest.fn() };
    initiativeProcessor = { process: jest.fn() };
    skillProcessor = { process: jest.fn() };
    attackProcessor = { process: jest.fn() };
    equipmentProcessor = { process: jest.fn() };
    hPProcessor = { process: jest.fn() };
    defenseProcessor = { process: jest.fn() };

    service = new CharacterProcessorService(
      statProcessor as any,
      movementProcessor as any,
      initiativeProcessor as any,
      skillProcessor as any,
      attackProcessor as any,
      equipmentProcessor as any,
      hPProcessor as any,
      defenseProcessor as any,
    );
  });

  it('should call all processors with the character', () => {
    const character: Partial<Character> = { name: 'Test', statistics: {} as CharacterStatistics };
    service.process(character);
    expect(statProcessor.process).toHaveBeenCalledWith(character);
    expect(movementProcessor.process).toHaveBeenCalledWith(character);
    expect(initiativeProcessor.process).toHaveBeenCalledWith(character);
    expect(skillProcessor.process).toHaveBeenCalledWith(character);
    expect(attackProcessor.process).toHaveBeenCalledWith(character);
    expect(equipmentProcessor.process).toHaveBeenCalledWith(character);
    expect(hPProcessor.process).toHaveBeenCalledWith(character);
    expect(defenseProcessor.process).toHaveBeenCalledWith(character);
  });
});

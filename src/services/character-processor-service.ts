import attackProcessor from './character/processor/attack-processor';
import initiativeProcessor from './character/processor/initiative-processor';
import movementProcessor from './character/processor/movement-processor';
import skillProcessor from './character/processor/skill-processor';

const process = (character: any): void => {
    movementProcessor.process(character);
    initiativeProcessor.process(character);
    skillProcessor.process(character);
    attackProcessor.process(character);
};

export default {
    process
};

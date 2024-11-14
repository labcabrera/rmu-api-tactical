const movementProcessor = require('./character/processor/movement-processor.js');
const skillProcessor = require('./character/processor/skill-processor.js');
const attackProcessor = require('./character/processor/attack-processor.js');

const process = (character) => {
    movementProcessor.process(character);
    skillProcessor.process(character);
    attackProcessor.process(character);
};

module.exports = {
    process
};
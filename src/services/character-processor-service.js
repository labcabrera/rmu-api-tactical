const movementProcessor = require('./character/processor/movement-processor.js');

const process = (character) => {
    movementProcessor.process(character);
};

module.exports = {
    process
};
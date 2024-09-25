const toJSON = (tacticalGame) => {
    return {
        id: tacticalGame._id,
        name: tacticalGame.name,
        status: tacticalGame.status,
        round: tacticalGame.round,
        phase: tacticalGame.phase,
        factions: tacticalGame.factions,
        description: tacticalGame.description,
        user: tacticalGame.user,
        createdAt: tacticalGame.createdAt,
        updatedAt: tacticalGame.updatedAt
    };
};

module.exports = {
    toJSON
};
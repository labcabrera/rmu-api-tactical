const request = require('supertest');
const app = require('../app');

describe('Character flow test', () => {

  it('should return 404 for name err', async () => {
    const res = await request(app)
      .post('/v1/characters')
      .send({
        "name": "Orc - Scimitar - Lvl 2",
        "tacticalGameId": "invalid-tactical-game",
        "faction": "Evil",
        "info": {
          "level": 2,
          "race": "lotr-orc-lesser",
          "sizeId": "medium",
          "height": 7,
          "weight": 120
        },
        "statistics": {
          "qu": {
            "custom": 1
          }
        },
        "movement": {
          "strideBonus": 1
        },
        "defense": {
          "armorType": 4,
          "defensiveBonus": 20

        },
        "hp": {
          "max": 25
        },
        "endurance": {
          "max": 45,
          "current": 40,
          "accumulator": 5
        },
        "power": {
          "max": 0
        },
        "initiative": {
          "customBonus": 1
        },
        "skills": [
          {
            "skillId": "perception",
            "customBonus": 30
          }
        ],
        "items": [
          {
            "name": "Scimitar",
            "itemTypeId": "scimitar",
            "category": "weapon",
            "attackTable": "scimitar",
            "skillId": "melee-weapon:blade"
          },
          {
            "name": "Normal Shield",
            "itemTypeId": "target-shield",
            "category": "shield",
            "attackTable": "shield",
            "skillId": "melee-weapon:shield-bash"
          },
          {
            "name": "Rigid Leather Armor",
            "itemTypeId": "rigid-leather-full-suit",
            "category": "armor"
          }
        ],
        "description": "Lorem ipsum"
      })
      .expect('Content-Type', /json/)
      .expect(400);
    expect(res.body.message).toEqual("TODO");
  });

  it('should return 404 for an unknown route', async () => {
    await request(app)
      .get('/api/unknown')
      .expect(404);
  });

});
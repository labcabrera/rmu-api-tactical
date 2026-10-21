import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiManeuverAdapter } from '../../../../src/modules/actions/infrastructure/api-clients/api.maneuver.adapter';
import { ApiSkillCatalogAdapter } from '../../../../src/modules/actions/infrastructure/api-clients/api.skill-catalog.adapter';
import type { TokenService } from '../../../../src/modules/auth/token.service';
import { BadGatewayError } from '../../../../src/modules/shared/domain/errors';

const BASE_URI = 'http://core/v1';
const tokenService = { getToken: () => Promise.resolve('token') } as unknown as TokenService;
const configService = { get: (key: string) => (key === 'RMU_API_CORE_URI' ? BASE_URI : undefined) } as unknown as ConfigService;

const mockGet = (data: unknown) => jest.spyOn(axios, 'get').mockResolvedValue({ data });
const axiosError = (status: number) =>
  Object.assign(new Error(`Status ${status}`), { isAxiosError: true, response: { status, data: { message: 'x' } } });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ApiManeuverAdapter', () => {
  const adapter = new ApiManeuverAdapter(tokenService, configService);

  it('asks for the table and the unusual event, and keeps the effects', async () => {
    const effects = [{ status: 'retryBonus', value: 10 }];
    const get = mockGet({ result: 'success', message: 'Done', effects });
    const result = await adapter.absolute(120, 'gymnastic', true);
    expect(get.mock.calls[0][0]).toBe(`${BASE_URI}/maneuvers/absolute?roll=120&table=gymnastic&unusualEvent=true`);
    expect(result).toEqual({ result: 'success', message: 'Done', effects });
  });

  it('asks for the generic table when none is given', async () => {
    const get = mockGet({ result: 'failure', message: 'No' });
    expect(await adapter.absolute(10)).toEqual({ result: 'failure', message: 'No', effects: [] });
    expect(get.mock.calls[0][0]).toBe(`${BASE_URI}/maneuvers/absolute?roll=10`);
  });
});

describe('ApiSkillCatalogAdapter', () => {
  const adapter = new ApiSkillCatalogAdapter(tokenService, configService);

  it('reads the skill with its maneuver profile, filling the defaults', async () => {
    const get = mockGet({ id: 'wall-scaling', categoryId: 'moves', maneuver: { movement: true, resultTable: 'gymnastic' } });
    const skill = await adapter.findSkill('wall-scaling');
    expect(get.mock.calls[0][0]).toBe(`${BASE_URI}/skills/wall-scaling`);
    expect(get.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer token' } });
    expect(skill).toEqual({
      id: 'wall-scaling',
      categoryId: 'moves',
      maneuver: { defaultType: 'absolute', resultTable: 'gymnastic', movement: true, light: 'none' },
    });
  });

  it('uses the default profile for a skill without one, and null for an unknown skill', async () => {
    mockGet({ id: 'old-lore', categoryId: 'lores' });
    expect((await adapter.findSkill('old-lore'))!.maneuver).toEqual({
      defaultType: 'absolute',
      resultTable: 'generic',
      movement: false,
      light: 'none',
    });
    jest.restoreAllMocks();
    jest.spyOn(axios, 'get').mockRejectedValue(axiosError(404));
    expect(await adapter.findSkill('nope')).toBeNull();
  });

  it('reads the maneuver modifiers of a skill', async () => {
    const modifiers = [{ id: 'm1', key: 'creature-herd', scope: { categoryIds: ['beasts'] }, type: 'flag', value: -15 }];
    const get = mockGet(modifiers);
    expect(await adapter.findManeuverModifiers('creature-taming')).toEqual(modifiers);
    expect(get.mock.calls[0][0]).toBe(`${BASE_URI}/maneuver-modifiers?skillId=creature-taming`);
  });

  it('turns a failure of core into a domain error', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(axiosError(500));
    await expect(adapter.findManeuverModifiers('x')).rejects.toBeInstanceOf(BadGatewayError);
  });
});

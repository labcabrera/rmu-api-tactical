import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { Character, CharacterPort } from '../../application/ports/character.port';

@Injectable()
export class CharacterApiClient implements CharacterPort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_STRATEGIC_URI') as string;
  }

  async findById(id: string): Promise<Character | undefined> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/characters/${id}`;
    try {
      const response = await axios.get(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as Character;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  async findByGameId(gameId: string): Promise<Character[]> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/characters?q=gameId==${gameId}&page=0&size=1000`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as Character[];
  }
}

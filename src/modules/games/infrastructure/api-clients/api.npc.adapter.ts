import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { Npc, NpcPort } from '../../application/ports/npc.port';

@Injectable()
export class ApiNpcAdapter implements NpcPort {
  private readonly baseUri: string;

  constructor(
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.baseUri = configService.get('RMU_API_NPC_URI') as string;
  }

  async findById(id: string): Promise<Npc | undefined> {
    const token = await this.tokenService.getToken();
    const uri = `${this.baseUri}/npcs/${id}`;
    try {
      const response = await axios.get(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as Npc;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return undefined;
      } else {
        throw err;
      }
    }
  }
}

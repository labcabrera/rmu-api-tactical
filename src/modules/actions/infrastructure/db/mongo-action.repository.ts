import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { Page } from '../../../shared/domain/entities/page.entity';
import { NotFoundError } from '../../../shared/domain/errors';
import { RsqlParser } from '../../../shared/infrastructure/messaging/rsql-parser';
import { ActionRepository } from '../../application/ports/action.repository';
import { Action } from '../../domain/entities/action.aggregate';
import { ActionDocument, ActionModel } from '../persistence/models/action.model';

@Injectable()
export class MongoActionRepository implements ActionRepository {
  constructor(
    @InjectModel(ActionModel.name) private actionModel: Model<ActionDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Action | null> {
    const readed = await this.actionModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Action>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [actionsDocs, totalElements] = await Promise.all([
      this.actionModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.actionModel.countDocuments(mongoQuery),
    ]);
    const content = actionsDocs.map((doc) => this.mapToEntity(doc));
    return new Page<Action>(content, page, size, totalElements);
  }

  async save(request: Partial<Action>): Promise<Action> {
    const model = new this.actionModel({ ...request, _id: request.id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, request: Partial<Action>): Promise<Action> {
    const current = await this.actionModel.findById(id);
    if (!current) {
      throw new NotFoundError('Action', id);
    }
    //TODO merge
    const update = request;
    const updatedAction = await this.actionModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updatedAction) {
      throw new NotFoundError('Action', id);
    }
    return this.mapToEntity(updatedAction);
  }

  async deleteById(id: string): Promise<Action | null> {
    const result = await this.actionModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.actionModel.deleteMany({ gameId });
  }
  async deleteByCharacterId(characterId: string): Promise<void> {
    await this.actionModel.deleteMany({ characterId });
  }

  private mapToEntity(doc: ActionDocument): Action {
    return new Action(
      doc._id,
      doc.gameId,
      doc.actorId,
      doc.round,
      doc.actionType,
      doc.phaseStart,
      doc.phaseEnd,
      doc.status,
      doc.actionPoints,
      doc.movement,
      doc.attacks,
      doc.maneuver,
      doc.fatigue,
      doc.description,
      doc.owner,
      doc.createdAt,
      doc.updatedAt,
    );
  }
}

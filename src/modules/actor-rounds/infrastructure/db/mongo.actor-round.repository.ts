import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import type { ActorRoundRepository } from '../../application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';
import { ActorRoundAlert, type ActorRoundAlertData } from '../../domain/value-objects/actor-round-alert.vo.js';
import { ActorRoundItems } from '../../domain/value-objects/actor-round-item.vo.js';
import { ActorRoundAttack } from '../../domain/value-objects/actor-round-attack.vo.js';
import { ActorRoundDefenseMode } from '../../domain/value-objects/actor-round-defense-mode.vo.js';
import { ActorRoundEffect } from '../../domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundPenaltyModifier } from '../../domain/value-objects/actor-round-penalty-modifier.vo.js';
import { ActorRoundPenalty } from '../../domain/value-objects/actor-round-penalty.vo.js';
import { ActorRoundPhaseLog } from '../../domain/value-objects/actor-round-phase-log.vo.js';
import { ActorRoundTrait } from '../../domain/value-objects/actor-round-trait.vo.js';
import { ApLedgerEntry, type ApLedgerKind } from '../../domain/value-objects/ap-ledger-entry.vo.js';
import type { HpLogEntry, HpLogKind } from '../../domain/value-objects/hp-log-entry.vo.js';
import type { ActorType } from '../../domain/value-objects/actor-type.vo.js';
import { type ActorRoundDocument, ActorRoundModel } from '../persistence/models/actor-round.model.js';

@Injectable()
export class MongoActorRoundRepository extends MongoBaseRepository<ActorRound, ActorRoundModel> implements ActorRoundRepository {
  constructor(@InjectModel(ActorRoundModel.name) actorRoundModel: Model<ActorRoundModel>, rsqlParser: RsqlParser) {
    super(actorRoundModel, rsqlParser);
  }

  async findByIds(ids: string[]): Promise<ActorRound[]> {
    if (!ids || ids.length === 0) return [];
    const docs = await this.model.find({ _id: { $in: ids } });
    return docs.map(doc => this.toEntity(doc));
  }

  findByGameAndRoundAndActors(gameId: string, round: number, actorIds: string[]): Promise<ActorRound[]> {
    const rsql = `gameId==${gameId};round==${round};actorId=in=(${actorIds.join(',')})`;
    return this.findByRsql(rsql, 0, actorIds.length).then(page => page.content);
  }

  async findByActorIdAndRound(gameId: string, actorId: string, round: number): Promise<ActorRound | null> {
    return this.model.findOne({ gameId, actorId, round }).then(readed => (readed ? this.toEntity(readed) : null));
  }

  async findByGameId(gameId: string): Promise<ActorRound[]> {
    const docs = await this.model.find({ gameId }).sort({ round: 1 });
    return docs.map(doc => this.toEntity(doc));
  }

  async deleteByGameId(gameId: string): Promise<void> {
    return this.model.deleteMany({ gameId }).then(() => undefined);
  }

  async findWithUndefinedInitiativeRoll(gameId: string, round: number): Promise<ActorRound[]> {
    return this.model
      .find({
        gameId,
        round,
        $or: [{ 'initiative.roll': { $exists: false } }, { 'initiative.roll': null }],
      })
      .then(docs => docs.map(doc => this.toEntity(doc)));
  }

  private static toHpLogEntry(entry: NonNullable<ActorRoundDocument['hpLog']>[number]): HpLogEntry {
    const mapped: HpLogEntry = { id: entry.id, round: entry.round, amount: entry.amount, kind: entry.kind as HpLogKind, at: entry.at };
    (['phase', 'actionId', 'attackerId', 'attackerName', 'injuryId', 'criticalKey'] as const).forEach(key => {
      if (entry[key] !== undefined && entry[key] !== null) {
        (mapped as unknown as Record<string, unknown>)[key] = entry[key];
      }
    });
    return mapped;
  }

  protected mapToEntity(doc: ActorRoundDocument): ActorRound {
    const penalty = doc.penalty
      ? new ActorRoundPenalty((doc.penalty.modifiers || []).map(m => new ActorRoundPenaltyModifier(m.id, m.source, m.value)))
      : new ActorRoundPenalty([]);
    const attacks: ActorRoundAttack[] = doc.attacks.map(e =>
      Object.assign(
        new ActorRoundAttack(
          e.attackName,
          e.boModifiers || [],
          e.baseBo,
          e.currentBo,
          e.type,
          e.attackTable,
          e.fumbleTable,
          e.attackSize,
          e.fumble,
          e.canThrow,
          e.meleeRange,
          e.ranges,
          e.twoHanded ?? false,
          e.weaponCategory ?? 'standard',
          e.skillId ?? null,
        ),
        { itemId: e.itemId ?? null, breakagePenalty: e.breakagePenalty ?? 0, broken: e.broken ?? false },
      ),
    );
    return ActorRound.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      actorType: doc.actorType as ActorType,
      round: doc.round,
      actorId: doc.actorId,
      actorName: doc.actorName,
      size: doc.size,
      raceName: doc.raceName,
      level: doc.level,
      factionId: doc.factionId,
      movement: doc.movement,
      initiative: doc.initiative,
      actionPoints: doc.actionPoints,
      hp: doc.hp,
      fatigue: doc.fatigue,
      penalty: penalty,
      defense: doc.defense,
      attacks: attacks,
      usedBo: doc.usedBo,
      parries: doc.parries,
      effects: (doc.effects || []).map(
        e =>
          new ActorRoundEffect(
            e.id,
            e.status,
            e.value ?? undefined,
            e.rounds ?? undefined,
            e.appliedRound,
            e.appliedPhase,
            e.spentApBefore,
            e.targetActorId,
            e.source,
          ),
      ),
      traits: (doc.traits || []).map(trait => new ActorRoundTrait(trait.traitId, trait.tier || 1, trait.specialization ?? null)),
      alerts: (doc.alerts || []).map(alert => ActorRoundAlert.from(alert as unknown as ActorRoundAlertData)),
      defenseMode: doc.defenseMode
        ? new ActorRoundDefenseMode(doc.defenseMode.dodge ?? 'none', doc.defenseMode.block ?? 'none')
        : ActorRoundDefenseMode.none(),
      phaseLog: (doc.phaseLog || []).map(entry => new ActorRoundPhaseLog(entry.phase, entry.spentAp, entry.totalSpentAp)),
      apLedger: (doc.apLedger || []).map(
        entry => new ApLedgerEntry(entry.phase, entry.actionId ?? undefined, entry.ap, entry.kind as ApLedgerKind),
      ),
      injuries: (doc.injuries || []).map(injury => ({ ...injury, treatments: injury.treatments || [] })),
      hpLog: (doc.hpLog || []).map(entry => MongoActorRoundRepository.toHpLogEntry(entry)),
      characterId: doc.characterId,
      items: (doc.items || []).map(item =>
        ActorRoundItems.copy({ ...item, modifiers: item.modifiers || [], startModifierIds: item.startModifierIds || [] }),
      ),
      snapshot: doc.snapshot
        ? { hp: doc.snapshot.hp, injuryIds: [...(doc.snapshot.injuryIds || [])], conditionIds: [...(doc.snapshot.conditionIds || [])] }
        : undefined,
      imageUrl: doc.imageUrl,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}

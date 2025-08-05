export const TYPES = {
  Logger: 'Logger',

  // Repositories
  ActionRepository: 'ActionRepository',
  CharacterRoundRepository: 'CharacterRoundRepository',
  CharacterRepository: 'CharacterRepository',
  GameRepository: 'GameRepository',

  // Security
  AuthTokenService: 'AuthTokenService',
  AuthService: 'AuthService',

  // Clients
  RaceClient: 'RaceClient',
  SkillClient: 'SkillClient',
  SkillCategoryClient: 'SkillCategoryClient',

  // Domain services
  CharacterProcessorService: 'CharacterProcessorService',

  // Action use cases
  CreateActionUseCase: 'CreateActionUseCase',
  DeleteActionUseCase: 'DeleteActionUseCase',
  FindActionByIdUseCase: 'FindActionByIdUseCase',
  FindActionsUseCase: 'FindActionsUseCase',

  // Character round use cases
  FindCharacterRoundsUseCase: 'FindCharacterRoundsUseCase',
  UpdateInitiativeUseCase: 'UpdateInitiativeUseCase',

  // Character use cases
  AddItemUseCase: 'AddItemUseCase',
  AddSkillUseCase: 'AddSkillUseCase',
  CreateCharacterUseCase: 'CreateCharacterUseCase',
  DeleteCharacterUseCase: 'DeleteCharacterUseCase',
  DeleteItemUseCase: 'DeleteItemUseCase',
  DeleteSkillUseCase: 'DeleteSkillUseCase',
  EquipItemUseCase: 'EquipItemUseCase',
  FindTCharacterByIdUseCase: 'FindTCharacterByIdUseCase',
  FindCharactersUseCase: 'FindCharactersUseCase',
  UpdateCharacterUseCase: 'UpdateCharacterUseCase',
  UpdateSkillUseCase: 'UpdateSkillUseCase',

  // Game use cases
  CreateGameUseCase: 'CreateGameUseCase',
  DeleteGameUseCase: 'DeleteGameUseCase',
  FindGameByIdUseCase: 'FindGameByIdUseCase',
  FindGamesUseCase: 'FindGamesUseCase',
  StartRoundUseCase: 'StartRoundUseCase',
  UpdateGameUseCase: 'UpdateGameUseCase',

  // Controllers
  ActionController: 'ActionController',
  AttackController: 'AttackController',
  CharacterRoundController: 'CharacterRoundController',
  CharacterController: 'CharacterController',
  GameController: 'GameController',

  // Event Notification Services
  EventNotificationPort: 'EventNotificationPort',
  EventNotificationRegistry: 'EventNotificationRegistry',
  GameCreatedEventNotificationService: 'GameCreatedEventNotificationService',
};

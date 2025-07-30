import express, { Request, Response, Router } from 'express';
import tacticalCharacterService from "../../../services/character-service";
import errorService from "../../../services/error-service";

interface CharacterQuery {
    search?: string;
    tacticalGameId?: string;
    page?: string;
    size?: string;
}

export class TacticalCharacterController {
    private router: Router;

    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/', this.findCharacters.bind(this));
        this.router.get('/:characterId', this.findCharacterById.bind(this));
        this.router.post('/', this.createCharacter.bind(this));
        this.router.patch('/:characterId', this.updateCharacter.bind(this));
    }

    private async findCharacters(req: Request<{}, {}, {}, CharacterQuery>, res: Response): Promise<void> {
        try {
            const searchExpression = req.query.search;
            const tacticalGameId = req.query.tacticalGameId;
            const page = req.query.page ? parseInt(req.query.page) : 0;
            const size = req.query.size ? parseInt(req.query.size) : 10;
            const response = await tacticalCharacterService.find(searchExpression, tacticalGameId, page, size);
            res.json(response);
        } catch (error) {
            errorService.sendErrorResponse(res, error as Error);
        }
    }

    private async findCharacterById(req: Request, res: Response): Promise<void> {
        try {
            const characterId: string = req.params.characterId!;
            const readedCharacter = await tacticalCharacterService.findById(characterId);
            res.json(readedCharacter);
        } catch (error: any) {
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async createCharacter(req: Request, res: Response): Promise<void> {
        try {
            const user: string = "lab.cabrera@gmail.com"; //TODO JWT
            const newCharacter = await tacticalCharacterService.insert(user, req.body);
            res.status(201).json(newCharacter);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    private async updateCharacter(req: Request, res: Response): Promise<void> {
        try {
            const characterId: string = req.params.characterId!;
            const result = await tacticalCharacterService.update(characterId, req.body);
            res.json(result);
        } catch (error: any) {
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}

import { Player } from 'hytopia';

export class Team {
  //players: Player[] = [];

  constructor(
    public name: string,
    public color: string,
    public players: Player[] = []
  ) {}
}
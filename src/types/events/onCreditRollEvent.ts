export class Credit {
  constructor(
    public displayName: string,
    public avatarUrl: string,

    public onCheer?: boolean,
    public onSub?: boolean,
    public onDonation?: boolean,
    public onRaid?: boolean,
    public tier?: number,
  ) {}
}

export class OnCreditRollEvent {
  constructor(public credits: Credit[]) {}
}

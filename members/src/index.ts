import { Collection, DB, Tigris } from "@tigrisdata/core";
import { Member } from "./members";

export class Members {

    private client: Tigris;
    private db: DB
    private memberCollection: Collection<Member>;

    constructor() {
        this.client = new Tigris();
        this.db = this.client.getDatabase();
        await this.client.registerSchemas([Member]);
        this.memberCollection = this.db.getCollection<Member>(Member);
    }

    saveMember(member: Member) {
        this.memberCollection.insertOne(member);
    }


}
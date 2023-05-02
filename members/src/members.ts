import { Field, PrimaryKey, TigrisCollection, TigrisDataTypes } from "@tigrisdata/core";

@TigrisCollection("members")
export class Member {

    @PrimaryKey(TigrisDataTypes.UUID, { autoGenerate: true, order: 1 })
    id?: string;

    @Field()
    name!: string;

    @Field()
    email!: string;

    /* Social Media */
    @Field()
    twitterHandle?: string;

    @Field()
    githubHandle?: string;

    @Field()
    youtubeChannel?: string;

    @Field()
    twitchChannel?: string;

    /* Integration IDs */
    // github_id?: string;
    discord_id?: string;
}
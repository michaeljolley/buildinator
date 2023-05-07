import { createBot, Intents, startBot } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { ably, Channels, Events } from "../../shared/ably/index.ts";
import { gatheringEndHandler, gatheringScheduledHandler, gatheringStartHandler } from "./gatherings.ts";
import { shareableCreatedHandler } from "./shareables.ts";
import { pullRequestMergedHandler } from "./contributions.ts";

const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");

const DISCORD_INTENTS =
    Intents.Guilds |
    Intents.GuildMembers |
    Intents.GuildMessages |
    Intents.DirectMessages |
    Intents.GuildMessageReactions |
    Intents.GuildInvites |
    Intents.GuildVoiceStates |
    Intents.GuildScheduledEvents;

const bot = createBot({
    token: DISCORD_TOKEN as string,
    intents: DISCORD_INTENTS,
    events: {
        ready() {
            console.log("Successfully connected to gateway");
        },
    },
});

const gatherings = ably.channels.get(Channels.Gatherings);
gatherings.subscribe(Events.GatheringScheduled, (message) => gatheringScheduledHandler(bot, message));
gatherings.subscribe(Events.GatheringStart, (message) => gatheringStartHandler(bot, message));
gatherings.subscribe(Events.GatheringEnd, (message) => gatheringEndHandler(bot, message));

const shareables = ably.channels.get(Channels.Shareables);
shareables.subscribe(Events.ShareableCreated, (message) => shareableCreatedHandler(bot, message));

const contributions = ably.channels.get(Channels.Contributions);
contributions.subscribe(Events.PullRequestMerged, (message) => pullRequestMergedHandler(bot, message));

await startBot(bot);
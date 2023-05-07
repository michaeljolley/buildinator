import type { Context } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import { ably, Channels, Events } from "../../../../shared/ably/index.ts";

export default async function gatheringUpdated(context: Context) {

    /**
     * If the gathering is an event, check to see if it has a discordEventId.
     * If it does, then we need to update the event in Discord.
     * If it does not, then we need to create the event in Discord.
     */

    const body = context.request.body();
    if (body.type !== "json") {
        context.response.body = "Unable to parse request body";
        context.response.status = 500;
        return;
    }

    const gathering = await body.value;
    const gatherings = ably.channels.get(Channels.Gatherings);
    await gatherings.publish(Events.GatheringScheduled, JSON.stringify(gathering));

    context.response.body = JSON.stringify({});
    context.response.status = 200;
    return;
}
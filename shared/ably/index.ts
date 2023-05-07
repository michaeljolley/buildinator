import Ably from "npm:ably@1.2.39";

const ABLY_TOKEN = Deno.env.get("ABLY_TOKEN");

const ably = new Ably.Realtime(ABLY_TOKEN as string)

ably.connection.on('connected', () => {
    console.log('Connected to Ably!');
});

export * from "./constants.ts";
export * from "./gatheringEvent.ts";
export { ably };

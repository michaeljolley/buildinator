// import { Types } from "npm:ably@1.2.39";
// import { Bot, addRole } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
// import { getMember } from "../../shared/orbit/index.ts";

// const DISCORD_GUILD_ID = Deno.env.DISCORD_GUILD_ID");
// const DISCORD_ROLE_CODE_CONTRIBUTOR = Deno.env.DISCORD_ROLE_CODE_CONTRIBUTOR");

// export async function pullRequestMergedHandler(bot: Bot, message: Types.Message) {

//     /**
//      * - Get the Orbit member associated with the pull request (if it exists)
//      * - See if the member has a Discord account associated with it
//      * - If so, add the Code Contributor role to the person in Discord
//      */

//     const pullRequest = JSON.parse(message.data);
//     const commits = pullRequest.commits;

//     // deno-lint-ignore no-explicit-any
//     const contributors = [...new Set(commits.map((commit: any) => commit.author.username))];

//     for (const contributor of contributors) {
//         const orbitMember = await getMember({ source: 'github', username: contributor as string });

//         if (orbitMember && orbitMember.data && orbitMember.included.length > 0) {
//             const discordInfo = orbitMember.included.find((identity) => identity.attributes.source === 'discord');

//             if (discordInfo && discordInfo.attributes.uid) {
//                 await addRole(bot, DISCORD_GUILD_ID as string, discordInfo.attributes.uid, DISCORD_ROLE_CODE_CONTRIBUTOR as string);
//             }
//         }
//     }
// }

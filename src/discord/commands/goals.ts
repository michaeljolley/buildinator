import { ForumChannel, GuildForumThreadCreateOptions, SlashCommandBuilder, ThreadAutoArchiveDuration } from "discord.js";
import { getSunday } from "../helpers";

export default {
    data: new SlashCommandBuilder()
        .setName('goals')
        .setDescription("Creates a new goal thread in the #weekly-goals channel for you, if one doesn't already exist."),
    async execute(interaction: any) {
        const weeklyGoalsChannel = await interaction.guild?.channels.fetch(
            process.env.DISCORD_CHANNEL_ID_WEEKLY_GOALS as string,
        ) as ForumChannel;

        if (weeklyGoalsChannel) {

            const sunday = getSunday();
            const threadName = `${interaction.user.username}'s Weekly Goals (${sunday})`
            let goalThread = weeklyGoalsChannel.threads.cache.filter(thread => thread.name === threadName).at(0)

            if (!goalThread) {
                const options: GuildForumThreadCreateOptions = {
                    name: threadName,
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                    reason: `Weekly goals thread for ${interaction.user} (${sunday})`,
                    message: {
                        content: `**Welcome to your weekly goals thread, ${interaction.user}!**\nUse the \`/new\` command to create a new goal, and \`/done {goal number}\` to mark a goal as complete.`
                    }
                }
                goalThread = await weeklyGoalsChannel.threads.create(options)
            }

            await interaction.reply(`Your weekly goals thread has been created! You can find it in the ${weeklyGoalsChannel} channel or here: <#${goalThread.id}>.`, { ephemeral: true });
        }
        else {
            await interaction.reply("I couldn't find the #weekly-goals channel. Please contact a moderator to resolve this issue.", { ephemeral: true });
        }
    }
}

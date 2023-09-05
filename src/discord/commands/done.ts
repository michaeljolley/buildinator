import { ForumChannel, SlashCommandBuilder, SlashCommandIntegerOption } from "discord.js";
import { getSunday, isThreadOwner } from "../helpers";
import { LogArea, LogLevel, log } from "../../log";

export default {
    data: new SlashCommandBuilder()
        .setName('done')
        .setDescription("Marks a goal as completed.")
        .addIntegerOption((option: SlashCommandIntegerOption) => option
            .setName('goal')
            .setDescription('The number of the goal you want to mark as completed.')
            .setRequired(true)),
    async execute(interaction: any) {
        try {
            const weeklyGoalsChannel = await interaction.guild?.channels.fetch(
                process.env.DISCORD_CHANNEL_ID_WEEKLY_GOALS as string,
            ) as ForumChannel;

            if (weeklyGoalsChannel) {

                const sunday = getSunday();
                const threadName = `${interaction.user.username}'s Weekly Goals (${sunday})`
                const goalThread = weeklyGoalsChannel.threads.cache.filter(thread => thread.name === threadName).at(0)

                if (goalThread) {
                    if (interaction.channel.id === goalThread.id) {

                        const messages = await goalThread.messages.fetch()
                        const message = messages.last()

                        if (message) {

                            const isCorrectUser = isThreadOwner(message.content, interaction.user.id)

                            if (isCorrectUser) {
                                const goal = interaction.options.getInteger('goal')

                                const goalRegex = new RegExp("\\([" + goal + "]+\\) (.*)", 'g');
                                const matches = message?.content.match(goalRegex);

                                if (matches && matches.length > 0) {
                                    const newContent = message.content.replace(matches[0], `~~${matches[0]}~~`);
                                    await message?.edit(newContent);
                                    await interaction.reply(`Great job! I've marked goal ${goal} as completed.`, { ephemeral: true });
                                }
                                else {
                                    await interaction.reply(`Sorry. I couldn't find goal #${goal}.`, { ephemeral: true });
                                }
                            }
                            else {
                                await interaction.reply(`Eh... I don't think this is your thread.`, { ephemeral: true });
                            }
                        }
                        else {
                            await interaction.reply(`Oh snap. Something went wrong.`, { ephemeral: true });
                        }
                    }
                    else {
                        await interaction.reply(`The \`/new\` command can only be run within **your** weekly goals thread located here: <#${goalThread.id}>`, { ephemeral: true });
                    }
                }
                else {
                    await interaction.reply(`Looks like you don't have a goals thread for the week of ${sunday}. Use \`/goals\` in any channel in the server to create one.`, { ephemeral: true });
                }
            }
            else {
                await interaction.reply("I couldn't find the #weekly-goals channel. Please contact a moderator to resolve this issue.", { ephemeral: true });
            }
        }
        catch (error) {
            log(LogLevel.Error, LogArea.Discord, `${error}`)
        }
    }
}

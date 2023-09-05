import { ForumChannel, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { getSunday, isThreadOwner } from "../helpers";
import { LogArea, LogLevel, log } from "../../log";

export default {
    data: new SlashCommandBuilder()
        .setName('new')
        .setDescription("Creates a new goal within your current #weekly-goals thread.")
        .addStringOption((option: SlashCommandStringOption) => option
            .setName('goal')
            .setDescription('The goal you want to add to your weekly goals thread.')
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
                                const goalCountRegex = new RegExp(/\([0-9]+\) \w+/g);

                                const goal = interaction.options.getString('goal').split('\n')[0]

                                const goalCount = (message?.content.match(goalCountRegex)?.length || 0) + 1;

                                if (message?.content.includes("**Goals**\n")) {
                                    await message.edit(`${message.content}\n(${goalCount}) ${goal}`)
                                } else {
                                    await message?.edit(`${message.content}\n\n**Goals**\n(${goalCount}) ${goal}`)
                                }

                                await interaction.reply(`Your new goal has been added.`, { ephemeral: true });
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

import { Bot } from "https://deno.land/x/discordeno@18.0.1/bot.ts";
import { BigString, DiscordScheduledEvent, ScheduledEvent, ScheduledEventEntityType, ScheduledEventPrivacyLevel } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export async function createScheduledEvent(
    bot: Bot,
    guildId: BigString,
    // deno-lint-ignore no-explicit-any
    options: any,
): Promise<ScheduledEvent> {
    if (!bot.utils.validateLength(options.name, { min: 1, max: 100 })) {
        throw new Error("Name must be between 1-100 characters.");
    }
    if (options.description && !bot.utils.validateLength(options.description, { max: 1000 })) {
        throw new Error("Description must be below 1000 characters.");
    }
    if (options.entity_metadata?.location) {
        if (!bot.utils.validateLength(options.entity_metadata?.location, { max: 100 })) {
            throw new Error("Location must be below 100 characters.");
        }
        if (options.entity_type === ScheduledEventEntityType.Voice) {
            throw new Error("Location can not be provided for a Voice event.");
        }
    }
    if (options.entity_type === ScheduledEventEntityType.External) {
        if (!options.scheduled_end_time) throw new Error("A scheduled end time is required when making an External event.");
        if (!options.entity_metadata?.location) throw new Error("A location is required when making an External event.");
    }
    if (options.scheduled_start_time && options.scheduled_end_time && options.scheduled_start_time > options.scheduled_end_time) {
        throw new Error("Cannot schedule event to end before starting.");
    }

    const result = await bot.rest.runMethod<DiscordScheduledEvent>(
        bot.rest,
        "POST",
        bot.constants.routes.GUILD_SCHEDULED_EVENTS(guildId),
        {
            channel_id: options.channel_id?.toString(),
            entity_metadata: options.entity_metadata,
            name: options.name,
            description: options.description,
            scheduled_start_time: new Date(options.scheduled_start_time).toISOString(),
            scheduled_end_time: options.scheduled_end_time ? new Date(options.scheduled_end_time).toISOString() : undefined,
            privacy_level: ScheduledEventPrivacyLevel.GuildOnly,
            entity_type: options.entity_type,
            reason: "",
            image: options.image
        },
    );

    return bot.transformers.scheduledEvent(bot, result);
}
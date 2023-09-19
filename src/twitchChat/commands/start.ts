import { OnCommandEvent } from '../../types/events/onCommandEvent';
import { OnStreamEvent } from '../../types/events/onStreamEvent';
import { Events } from '../../constants';
import { EventBus } from '../../events';
import { Stream } from '../../types/stream';
import TwitchAPI from '../../twitchAPI';
import { LogArea, LogLevel, log } from '../../log';

export default async function (onCommandEvent: OnCommandEvent): Promise<void> {

  if (!onCommandEvent.flags.broadcaster) {
    return;
  }

  let stream: Stream | undefined;
  const streamDate = new Date().toLocaleDateString('en-US');
  try {
    stream = await TwitchAPI.getStream(streamDate);
  } catch (err) {
    log(
      LogLevel.Error,
      LogArea.TwitchAPI,
      `webhooks: /stream_online - ${err}`,
    );
  }

  // Send the message to Twitch chat
  EventBus.eventEmitter.emit(Events.OnStreamStart, { stream } as OnStreamEvent);
}

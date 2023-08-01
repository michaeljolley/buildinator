import fs from 'fs';
import {Events} from '../../constants';
import {EventBus} from '../../events';
import {ShouldThrottle} from '../shouldThrottle';
import {OnCommandEvent} from '../../types/events/onCommandEvent';
import { OnSayEvent } from '../../types/events/onSayEvent';

/**
 * Determines if the command is an audio clip and attempts to play if so
 * @param onCommandEvent
 */
export function sfx(onCommandEvent: OnCommandEvent): void {
  const cooldownSeconds = 60;

  // The broadcaster & mods are allowed to bypass throttling. Otherwise,
  // only proceed if the command hasn't been used within the cooldown.
  if (
    !onCommandEvent.flags.broadcaster &&
    !onCommandEvent.flags.mod &&
    ShouldThrottle(onCommandEvent.extra.sinceLastCommand, cooldownSeconds, true)
  ) {
    return;
  }
  let basePath = '.';

  // When running inside a container the audio files are in a slightly different location
  if (fs.existsSync('./www')) {
    basePath = './www/overlays/public';
  }
  const fullpath = `${basePath}/assets/audio/clips`;

  const soundEffects = fs.readdirSync(fullpath).map(c => {
    return `!${c.replace('.mp3', '')}`;
  })
  .join(', ');

const message = `I can play the following sound effects: ${soundEffects}`;

// Send the message to Twitch chat
EventBus.eventEmitter.emit(Events.OnSay, new OnSayEvent(message));
}

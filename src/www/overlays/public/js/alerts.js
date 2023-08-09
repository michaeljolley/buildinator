Vue.config.devtools = true;

Vue.component('alert', {
  template: `<div class="alert">
  <h2><span>@{{alert.name}}</span>{{alert.message}}</h2>
  <p>{{alert.subtext}}</p>
</div>`,
  props: ['alert'],
});

const app = new Vue({
  el: '#app',
  data: function () {
    return {
      alerts: [],
      socket: null,
      muted: false,
      activeAudioPlayer: null,
      activeAlert: null
    };
  },
  methods: {
    addAlert: function (type, data) {
      this.alerts.push({
        type,
        data
      });
    },
    playAudio() {
      if (this.activeAlert &&
        this.activeAlert.audio) {

        let audio = this.$refs.audioFile;
        audio.src = this.activeAlert.audio;
        audio.play().catch(error => {
          console.log(error);
        })
      }
    },
    alertsAudioSrc(audioName) {
      return `assets/audio/alerts/${audioName}.mp3`;
    },
    clipsAudioSrc(audioFileName) {
      return `assets/audio/clips/${audioFileName}`;
    },
    clearAudio() {
      const audio = document.createElement('audio');
      audio.src = '';
    },
    stopAudio() {
      let audio = this.$refs.audioFile;
      audio.pause();
      this.alerts = this.alerts.filter(f => f.line1);
    },
    muteAudio() {
      let audio = this.$refs.audioFile;
      audio.pause();
      this.muted = true;
    },
    unmuteAudio() {
      this.muted = false;
    },
    processNextAlert() {
      const nextAlert = this.alerts[0];
      let name;

      if (nextAlert.type === 'onDonation') {
        name = nextAlert.data.user;
      } else if (nextAlert.data.user) {
        name = nextAlert.data.user.display_name || nextAlert.data.user.login;
      }
      let message;
      let subtext;
      let icon;
      let audio;

      switch (nextAlert.type) {
        case 'twitch:sound_effect':
          audio = this.clipsAudioSrc(nextAlert.data.filename);
          break;
        case 'twitch:follow':
          message = ` just followed the channel`;
          icon = '';
          audio = this.alertsAudioSrc('ohmy');
          break;
        case 'twitch:sub':
          message = ` just subscribed`;
          subtext = "We'll make a donation to Backpack Buddies. Use !bpb to learn more";
          icon = '';
          audio = this.alertsAudioSrc('hair');
          break;
        case 'twich:raid': 
          message = ` just joined in the fun`;
          subtext = "Welcome raiders!";
          icon = '';
          audio = this.alertsAudioSrc('goodbadugly');
          break;
        case 'twitch:cheer':
          message = `, thanks for the support`;
          subtext = "We'll make a donation to Backpack Buddies. Use !bpb to learn more";
          icon = '';
          audio = this.alertsAudioSrc('cheer');
          break;
        case 'twitch:donation':
          message = `, gave $${nextAlert.data.amount}}!`;
          subtext = "We'll make a donation to Backpack Buddies. Use !bpb to learn more";
          icon = '';
          audio = this.alertsAudioSrc('donate');
          break;
      }

      this.alerts.shift();
      this.activeAlert = {
        name,
        message,
        subtext,
        icon: icon,
        audio: this.muted ? null : audio
      };

      this.playAudio();

      setTimeout(() => {
        this.activeAlert = null;
        this.audio = null;
      }, 5000);
    },
    onInterval() {
      if (!this.activeAlert &&
        this.alerts.length > 0) {
        this.processNextAlert();
      }
    }
  },
  mounted() {
    this.socket = io.connect('/');

    const audio = document.createElement('audio');
    audio.addEventListener('ended', this.clearAudio, false);

    this.socket.on('twitch:sound_effect', onSoundEffectEvent => {
      this.addAlert('twitch:sound_effect', onSoundEffectEvent);
    });

    this.socket.on('twitch:stop', onStopEvent => {
      this.stopAudio();
    });
    
    this.socket.on('twitch:mute', onMuteEvent => {
      this.muteAudio();
    });
    
    this.socket.on('twitch:unmute', onUnmuteEvent => {
      this.unmuteAudio();
    });

    this.socket.on('twitch:follow', onFollowEvent => {
      this.addAlert('twitch:follow', onFollowEvent);
    });

    this.socket.on('twitch:sub', onSubEvent => {
      this.addAlert('twitch:sub', onSubEvent);
    });

    this.socket.on('twich:raid', onRaidEvent => {
      this.addAlert('twich:raid', onRaidEvent);
    });

    this.socket.on('twitch:cheer', onCheerEvent => {
      this.addAlert('twitch:cheer', onCheerEvent);
    });

    this.socket.on('twitch:donation', onDonationEvent => {
      this.addAlert('twitch:donation', onDonationEvent);
    });

    this.socket.on('reconnect', () => {
      window.location.reload();
    });

    console.log("We're loaded and listening the socket.io hub");

    setInterval(this.onInterval, 2000);
  },
  template:
    `<div class="container">
        <audio ref="audioFile"/>
        <transition name="wipe-left">
          <alert :alert="activeAlert" v-if="activeAlert"/>
        </transition>
      </div>`
})

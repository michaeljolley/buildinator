Vue.config.devtools = true;

Vue.component('alert', {
  template: `<div class="alert" v-if="alert" v-bind:class="{hide: hideMe}">
  <h2><span>@{{alert.name}}</span>{{alert.message}}</h2>
  <p>{{alert.subtext}}</p>
</div>`,
  props: ['letter'],
  data: function () {
    return {
      alert: null,
      hideMe: false,
      destroyTimeout: null
    }
  },
  methods: {
    finish: function () {
      this.hideMe = true;
    }
  },
  mounted: function () {
    this.destroyTimeout = setTimeout(() => {
      this.hideMe = true;
    }, 5000);
  },
  destroyed: function () {
    clearTimeout(this.destroyTimeout);
  }
});

const app = new Vue({
  el: '#app',
  data: function () {
    return {
      alerts: [],
      socket: null,
      muted: false,
      activeAudioPlayer: null,
      topic: '',
      activeAlert: {
        name: null,
        message: null,
        subtext: null,
        icon: null,
        audio: null
      }
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
    setTopic(onTopicEvent) {
      this.topic = onTopicEvent.topic;
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
          message = `<span>${name}</span> just followed the channel`;
          icon = '';
          break;
        case 'twitch:sub':
          message = `just subscribed`;
          subtext = "We'll make a donation to Backpack Buddies. Use !bpb to learn more";
          icon = '';
          audio = this.alertsAudioSrc('hair');
          break;
        case 'twich:raid': 
          message = `just joined in the fun`;
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
        message: message ? message : null,
        subtext: subtext ? subtext : null,
        icon: icon ? icon : null,
        audio: this.muted ? null : audio
      };
      this.playAudio();

      setTimeout(() => {
        this.activeAlert = {
          name: null,
          message: null,
          subtext: null,
          icon: null,
          audio: null
        };
        this.audio = null;
      }, 5000);
    },
    onInterval() {
      if (!this.activeAlert.line1 &&
        !this.activeAlert.audio &&
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

    this.socket.on('twitch:topic', onTopicEvent => {
      this.setTopic(onTopicEvent);
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
    `<div class="bar">
        <div class="container">
          <audio ref="audioFile"/>

          <div class="left">
            <svg
              id="a"
              class="fill logo"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 50 50"
            >
              <path
                d="M20.84,24.89c0,1.72-1.4,3.12-3.12,3.12s-3.12-1.4-3.12-3.12,1.4-3.12,3.12-3.12,3.12,1.39,3.12,3.12Zm11.57-3.12c-1.72,0-3.12,1.4-3.12,3.12s1.4,3.12,3.12,3.12,3.12-1.4,3.12-3.12c0-1.73-1.4-3.12-3.12-3.12Zm13.8-.86c-.41-.56-.91-1.06-1.49-1.46C43.23,9.01,34.85,1,25.03,1h-.07C15.14,1,6.76,9.01,5.27,19.46c-.57,.4-1.08,.89-1.49,1.46-.72,.99-1.14,2.21-1.14,3.53,0,3.34,2.71,5.96,6.06,5.96h.11v-3.79h-.14c-1.27,0-2.29-1.05-2.29-2.32s1.14-2.31,2.42-2.32h.06c.11-1.34,.26-2.53,.47-3.56h0c1.58-7.84,8.06-13.72,15.62-13.72h.1c7.57,0,14.04,5.88,15.62,13.72h0c.2,1.03,.36,2.21,.47,3.56h.07c1.28,0,2.42,1.04,2.42,2.32s-1.03,2.31-2.29,2.32h-.14v3.79h.11c3.34,0,6.06-2.61,6.06-5.96,0-1.32-.43-2.54-1.15-3.53Zm-5.03,12.34v7.06c0,2.46-1.99,4.44-4.44,4.44h-5.7c-4.23,0-4.24,4.19-4.24,4.24h-3.6s0-4.24-4.24-4.24h-5.7c-2.46,0-4.44-1.99-4.44-4.44v-7.06c1.98,0,3.6,1.61,3.6,3.6v2.85s0,.8,.72,.8h2.97v-3.66c0-1.35,1.09-2.44,2.44-2.44h3.14c2.32,0,2.33-2.32,2.33-2.33h1.97s0,2.33,2.33,2.33h3.14c1.35,0,2.44,1.09,2.44,2.44v3.66h2.97c.71,0,.72-.8,.72-.8v-2.85c0-1.99,1.6-3.6,3.59-3.6Zm-9.26,3.91s0-.44-.4-.44h-3.58c-.87,0-1.55-.17-2.02-.49s-.76-.86-.92-1.59c-.17,.74-.46,1.27-.92,1.59s-1.14,.49-2.02,.49h-3.58c-.39,0-.4,.44-.4,.44v3.32h1.55c1.6,0,2.82,.29,3.67,.88,.85,.58,1.39,1.55,1.69,2.9,.3-1.35,.84-2.31,1.69-2.9,.85-.58,2.07-.88,3.67-.88h1.56v-3.32h0Z"
              ></path>
            </svg>
            {{topic}}
          </div>
          <div class="right">
            <alert :alert="activeAlert"/>
          </div>
          
        </div>
      </div>`
})

Vue.config.devtools = true;

Vue.component('vote', {
  template: `<li><img :src="avatar_url"/></li>`,
  props: ['avatar_url']
});

Vue.component('bar', {
  template: `
    <div class="bar">
      <ul>
        <vote v-for="vote in choice.votes" :key="vote.user.login" :avatar_url="vote.user.avatar_url"/>
      </ul>
      <p>{{choice.name}}</p>
    </div>`,
  props: ['choice']
});

const app = new Vue({
  el: '#app',
  data: function () {
    return {
      poll: null,
      choices: [],
      endInterval: null,
      socket: null,
      hasWinner: false,
    };
  },
  methods: {
    onVoteEnd() {
      this.poll = null
      this.hasWinner = false
      this.choices = []
      clearInterval(this.endInterval)
    },
    onVoteStart(onVoteStartEvent) {
      this.poll = onVoteStartEvent.pollId
      this.hasWinner = false
      this.choices = []
    },
    onVote(onVoteEvent) {
      if (onVoteEvent.pollId === this.poll) {
        const choice = this.choices.find(f => f.name === onVoteEvent.choice)
        if (choice) {
          choice.votes.push(onVoteEvent)
        } else {
          this.choices.push({
            name: onVoteEvent.choice,
            votes: [onVoteEvent]
          })
        }
      }
    },
    onVoteWinner(onVoteWinnerEvent) {
      if (this.endInterval) {
        clearInterval(this.endInterval)
      }

      this.hasWinner = true;
      this.endInterval = setInterval(() => {
        this.onVoteEnd();
      }, 10000)
    }
  },
  created() {
    this.socket = io.connect('/');

    this.socket.on('onVoteWinner', onVoteWinnerEvent =>
      this.onVoteWinner(onVoteWinnerEvent));

    this.socket.on('onVote', onVoteEvent => this.onVote(onVoteEvent));

    this.socket.on('onVoteStart', onVoteStartEvent =>
      this.onVoteStart(onVoteStartEvent));

    this.socket.on('onVoteEnd', onVoteEndEvent => {
      // Wait 5 seconds before removing everything to make sure we don't
      // get an onVoteWinner event.
      this.endInterval = setInterval(() => {
        this.onVoteEnd();
      }, 5000);
    });

    this.socket.on('reconnect', () => {
      window.location.reload();
    });

    console.log("We're loaded and listening to polls from socket.io");
  },
  template: `<div class="chart" :class="{done: hasWinner}">
              <bar v-for="choice in choices" :key="choice.name" :choice="choice" />
             </div>`
})

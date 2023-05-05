export type Member = {
  id?: string;
  name!: string;
email!: string;

/* Social Media */
twitterHandle ?: string;
githubHandle ?: string;
youtubeChannel ?: string;
twitchChannel ?: string;
linkedInProfile ?: string;

/* Integration IDs */
discord_id ?: string;
  }

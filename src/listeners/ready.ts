import { Listener } from 'discord-akairo';
import { CategoryChannel } from 'discord.js';

export default class ReadyListener extends Listener {
	public constructor() {
		super('ready', {
			emitter: 'client',
			event: 'ready',
		});
	}

	public exec() {
		console.log(`Bot logged in as ${this.client.user!.tag}`);
		if (!this.client.guilds.cache.has(this.client.config.GUILD))
			throw new Error('Cannot find the specified Guild!');
		this.client.guild = this.client.guilds.cache.get(this.client.config.GUILD);

		if (!this.client.channels.cache.has(this.client.config.MODMAIL_CATEGORY))
			throw new Error('Cannot find the specified Modmail Category!');
		this.client.modMailCategory = this.client.channels.cache.get(
			this.client.config.MODMAIL_CATEGORY,
		)! as CategoryChannel;
	}
}

import { Listener } from 'discord-akairo';
import { TextChannel, CategoryChannel, ActivityType } from 'discord.js';
import Guild from '../schemas/Guild';

export default class ReadyListener extends Listener {
	public status: { type: ActivityType; name: string }[] = [
		{
			type: 'COMPETING',
			name: 'a battle for your love'
		},
		{
			type: 'WATCHING',
			name: 'questions related to cram issues'
		},
		{
			type: 'WATCHING',
			name: 'questions related to account issues'
		}
	];

	public constructor() {
		super('ready', {
			emitter: 'client',
			event: 'ready'
		});
	}

	public async exec() {
		// below code checks to make sure the specified guild, modmail category, and modmail main channel are valid.
		if (!this.client.user) return;

		this.client.info(`Bot logged in as ${this.client.user!.tag}`);
		if (!this.client.guilds.cache.has(this.client.config.GUILD))
			throw new Error('Cannot find the specified Guild!');
		this.client.guild = this.client.guilds.cache.get(this.client.config.GUILD);

		if (!this.client.channels.cache.has(this.client.config.MODMAIL_CATEGORY))
			throw new Error('Cannot find the specified Modmail Category!');
		this.client.modMailCategory = this.client.channels.cache.get(
			this.client.config.MODMAIL_CATEGORY
		)! as CategoryChannel;

		if (!this.client.channels.cache.has(this.client.config.MODMAIL_MAIN_CHANNEL))
			throw new Error('Cannot find the specified main Modmail channel!');

		this.client.modMailMainChannel = this.client.channels.cache.get(
			this.client.config.MODMAIL_MAIN_CHANNEL
		) as TextChannel;

		if (!(await Guild.findById(this.client.guild!.id))) {
			await new Guild({
				_id: this.client.guild!.id,
				blocklist: []
			}).save();
		}

		return this.rotateStatus();
	}

	public rotateStatus() {
		void this.changeStatus();
		this.client.statusInterval = setInterval(this.changeStatus, 1000 * 60 * 15);
	}

	public changeStatus() {
		return this.client.user?.setPresence({
			activity: this.status[Math.floor(Math.random() * this.status.length)],
			status: 'online'
		});
	}
}

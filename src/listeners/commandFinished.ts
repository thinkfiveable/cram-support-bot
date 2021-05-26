import { Command, Listener } from 'discord-akairo';
import { Message } from 'discord.js';

export default class CommandFinishedListener extends Listener {
	public constructor() {
		super('commandFinished', {
			emitter: 'commandHandler',
			event: 'commandFinished',
			category: 'commandHandler'
		});
	}

	public exec(message: Message, command: Command) {
		this.client.info_but_yellow(
			`Command ${command.id} executed by: ${message.author.tag} (${message.author.id}) on ${
				message.guild ? `${message.guild.name} (${message.guild.id})` : `DM`
			}`
		);
	}
}

import { Listener } from 'discord-akairo';
import { MessageEmbed } from 'discord.js';
import { TextChannel } from 'discord.js';
import { Message } from 'discord.js';

export default class CommandErrorListener extends Listener {
	public constructor() {
		super('error', {
			emitter: 'commandHandler',
			event: 'error',
			category: 'commandHandler'
		});
	}

	public exec(error: Error, message: Message) {
		this.client.error(`[Command Error] ${error.stack ? error.stack : 'NO STACK'}`);
		if (!(message.channel instanceof TextChannel)) return;
		if (!message.channel.permissionsFor(this.client.user!)!.has('SEND_MESSAGES')) return;
		return message.channel.send(
			new MessageEmbed()
				.setColor('RED')
				.setTitle('An Internal Error occured.')
				.setDescription('`Please forward this error to the Community Interns.`')
		);
	}
}

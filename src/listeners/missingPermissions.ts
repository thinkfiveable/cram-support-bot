import { Command } from 'discord-akairo';
import { Listener } from 'discord-akairo';
import { MessageEmbed } from 'discord.js';
import { Message } from 'discord.js';

export default class missingPermissions extends Listener {
	public constructor() {
		super('missingPermissions', {
			emitter: 'commandHandler',
			event: 'missingPermissions'
		});
	}

	public exec(message: Message, command: Command, type: 'client' | 'user', missing: string[] | string) {
		if (!message.guild) return;
		console.log(
			`${type === 'user' ? `User ${message.author.tag} (${message.author.id})` : 'Client'} is "${
				Array.isArray(missing)
					? `missing permissions ${missing.map((x) => `\`${x}\``).join(', ')}`
					: missing
			}" when executing command "${command.id}" in guild "${message.guild.name}" (${message.guild.id})`
		);
		return type === 'user'
			? this.userMissingPermissions(message, missing)
			: this.clientMissingPermissions(message, missing);
	}

	private async userMissingPermissions(message: Message, missing: string[] | string) {
		return message.channel.send(
			new MessageEmbed()
				.setTitle('You are missing permissions!')
				.setColor('RED')
				.setDescription(
					`You are ${
						Array.isArray(missing)
							? `missing the following permissions: ${missing
									.map((x: string) => `\`${x}\``)
									.join(', ')}`
							: missing
					}`
				)
		);
	}

	private async clientMissingPermissions(message: Message, missing: string[] | string) {
		return message.channel.send(
			new MessageEmbed()
				.setTitle('I am missing permissions!')
				.setColor('RED')
				.setDescription(
					`I am ${
						Array.isArray(missing)
							? `missing the following permissions: ${missing
									.map((x: string) => `\`${x}\``)
									.join(', ')}`
							: missing
					}`
				)
		);
	}
}

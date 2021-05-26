import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';
import Thread from '../schemas/Thread';

export default class Stats extends Command {
	public constructor() {
		super('stats', {
			aliases: ['stats', 'stat', 'infoo'],
			ratelimit: 2,
			cooldown: 20000,
			args: [],
			channel: 'guild',
			description: {
				content: 'Get statistics about this running instance.',
				usage: [''],
				example: ['']
			}
		});
	}

	public async exec(msg: Message) {
		const creator = this.client.users.cache.get(this.client.config.ADMIN_ID);
		// derived from https://github.com/Naval-Base/yuudachi/blob/master/src/bot/commands/util/stats.ts
		return msg.channel.send(
			new MessageEmbed()
				.setTitle('Statistics about me!')
				.setColor('GREEN')
				.addField(
					'❯ Memory Usage',
					`${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
					true
				)
				.addField(
					'❯ General Stats',
					stripIndents`
                    • Users: ${this.client.users.cache.size}
                    • Channels: ${this.client.channels.cache.size}
					• Tickets opened: ${await Thread.countDocuments()}
                `,
					true
				)
				.addField(
					'❯ Source Code',
					'[View Here](https://github.com/ThinkFiveable/cram-support-bot)',
					false
				)
				.addField(
					'❯ Library',
					'[discord.js](https://discord.js.org)[-akairo](https://github.com/1Computer1/discord-akairo)',
					true
				)
				.setThumbnail(this.client.user?.displayAvatarURL() ?? '')
				.setFooter(`© 2021 Fiveable | Created by ${creator!.tag}`, creator!.displayAvatarURL())
		);
	}
}

import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { MessageAttachment } from 'discord.js';
import { Message } from 'discord.js';
import Thread from '../schemas/Thread';
import { messageFormatTicket, respondersFormat } from '../util';

export default class Fetch extends Command {
	public constructor() {
		super('fetch', {
			aliases: ['fetch'],
			ratelimit: 2,
			cooldown: 20000,
			args: [
				{
					id: 'id',
					type: 'string'
				}
			],
			channel: 'guild',
			description: {
				content: 'Fetch info and messages belonging to a ticket.',
				usage: ['<id>'],
				example: ['3297382hhfweq89w']
			},
			userPermissions: ['KICK_MEMBERS']
		});
	}

	public async exec(msg: Message, { id }: { id: string }) {
		if (!id) return msg.channel.send('Please provide a proper ID!');
		const fetchThread = await Thread.findById(id);
		if (!fetchThread) return msg.channel.send('Thread with that ID does not exist!');
		const [opener, responders, MESSAGE_LOG] = await messageFormatTicket(this.client, fetchThread);

		return msg.channel.send(
			stripIndents`
            **ID:** \`${fetchThread.id}\`
			**Opener:** \`${opener.tag} (${opener.id})\`
			**Issue:** \`${
				fetchThread.data.issue.length > 300
					? `${fetchThread.data.issue.substring(0, 300)}...`
					: fetchThread.data.issue
			}\`
			**Responders:** \`${respondersFormat(responders)}\`
			**Message log is attached to this message.**
            `,
			{
				files: [
					new MessageAttachment(
						Buffer.from(stripIndents`
						ID: ${fetchThread.id}
						
						${MESSAGE_LOG}
						`),
						`${opener.tag.replace('#', '-')}-MESSAGES-${Date.now()}.txt`
					)
				]
			}
		);
	}
}

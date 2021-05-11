import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
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
					type: 'string',
				},
			],
			channel: 'guild',
			description: {
				content: 'Fetch info and messages belonging to a ticket.',
				usage: ['<id>'],
				example: ['3297382hhfweq89w'],
			},
		});
	}

	public async exec(msg: Message, { id }: { id: string }) {
		const fetchThread = await Thread.findById(id);
		if (!fetchThread) return msg.channel.send('Thread with that ID does not exist!');
		const [opener, responders, MESSAGE_LOG] = await messageFormatTicket(this.client, fetchThread);

		return msg.channel.send(stripIndents`
            **ID:** \`${msg.id}\`
			**Opener:** \`${opener.tag} (${opener.id})\`
			**Issue:** \`${
				fetchThread.data.issue.length > 300
					? `${fetchThread.data.issue.substring(0, 300)}...`
					: fetchThread.data.issue
			}\`
			**Responders:** \`${respondersFormat(responders)}\`
			**Messages:**

			${MESSAGE_LOG.length > 1200 ? `${MESSAGE_LOG.substring(0, 1200)}...` : MESSAGE_LOG}
            `);
	}
}

import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { User, Collection, Message } from 'discord.js';
import Thread from '../schemas/Thread';

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
		const fetch_thread = await Thread.findById(id);
		if (!fetch_thread) return msg.channel.send('Thread with that ID does not exist!');

		// get ticket opener
		const opener = await this.client.users.fetch(fetch_thread.author_id);

		// get the ids of all the staff members who participated in the ticket
		const responderIDs = new Set(fetch_thread.messages.map((x) => x.msg_author_id));
		const responders = new Collection<string, User | null>();

		// add ticket opener to responders list
		responders.set(opener.id, opener);

		// get user object of all staff members that participated
		responderIDs.forEach(async (responder) => {
			if (responder === opener.id) return;
			responders.set(responder, await this.client.users.fetch(responder).catch(() => null));
		});

		// format message like "STAFF_MEMBER: MESSAGE THEY SENT HERE"
		const message_log = fetch_thread.messages
			.map((x) => `\`${responders.get(x.msg_author_id)?.tag ?? 'UNKNOWN'}: ${x.content}\``)
			.join('\n');

		return msg.channel.send(stripIndents`
            **ID:** \`${msg.id}\`
			**Opener:** \`${opener.tag} (${opener.id})\`
			**Issue:** \`${
				fetch_thread.data.issue.length > 300
					? `${fetch_thread.data.issue.substring(0, 300)}...`
					: fetch_thread.data.issue
			}\`
			**Responders:** \`${responders.map((x, id) => (x ? `\`${x.tag} (${x.id})\`` : `\`UNKNOWN (${id})\``))}\`
			**Messages:**

			${message_log.length > 1200 ? `${message_log.substring(0, 1200)}...` : message_log}
            `);
	}
}

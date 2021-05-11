import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { TextChannel, Message } from 'discord.js';
import Thread from '../schemas/Thread';

export default class Close extends Command {
	public constructor() {
		super('close', {
			aliases: ['close'],
			ratelimit: 2,
			cooldown: 20000,
			args: [
				{
					id: 'thread',
					type: 'textChannel',
					default: (m) => m.channel,
				},
				{
					id: 'silent',
					match: 'flag',
					flag: ['--silent', '--silently'],
				},
			],
			channel: 'guild',
			description: {
				content: 'Close a ticket.',
				usage: ['[#channel]'],
				example: ['', '#ticket-channel'],
			},
		});
	}

	public async exec(msg: Message, { thread, silent }: { thread: TextChannel; silent: boolean }) {
		// allow people to run this command in either the ticket channel itself or another one and target the channel
		const ticket = await Thread.findOne({ thread_id: thread.id });

		if (!ticket) return msg.channel.send(`Cannot locate ticket by channel.`);
		ticket.closed = true;
		// close ticket
		await ticket.save();

		// get ticket opener
		const opener = await this.client.users.fetch(ticket.author_id);

		this.client.modMailMainChannel?.send(stripIndents`
			Archived Ticket \`${ticket._id}\`
			Opener: \`${opener.tag} (${opener.id})\`
			Closer: \`${msg.author.tag}\`
		`);

		if (!silent)
			await opener.send(`\`Your recent support ticket (${ticket._id}) has been closed.\``).catch(() => void 0);

		if (msg.channel.id !== thread.id) void msg.channel.send('Ticket has been closed.');
		return thread.delete();
	}
}

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
					id: 'channel',
					type: 'textChannel',
				},
			],
			channel: 'guild',
		});
	}

	public async exec(msg: Message, { channel }: { channel: TextChannel | undefined }) {
		const thread = channel ?? msg.channel;
		const ticket = await Thread.findOne({ thread_id: thread.id });

		if (!ticket) return msg.channel.send(`Cannot locate ticket by channel.`);
		ticket.closed = true;
		await ticket.save();

		const opener = await this.client.users.fetch(ticket.author_id);
		await opener.send(`\`Your recent support ticket (${ticket._id}) has been closed.\``).catch(() => void 0);

		if (msg.channel.id !== thread.id) void msg.channel.send('Ticket has been closed.');
		return thread.send(`Ticket has been closed by \`${msg.author.tag}\`.`);
	}
}

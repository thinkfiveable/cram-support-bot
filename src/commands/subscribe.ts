import { Command } from 'discord-akairo';
import { User, Message } from 'discord.js';
import Thread from '../schemas/Thread';

export default class Subscribe extends Command {
	public constructor() {
		super('subscribe', {
			aliases: ['subscribe'],
			ratelimit: 2,
			cooldown: 20000,
			args: [
				{
					id: 'user',
					type: 'user',
					default: (m) => m.author
				}
			],
			channel: 'guild',
			description: {
				content: 'Subscribe yourself to a ticket.',
				usage: ['[user]'],
				example: ['@nico']
			}
		});
	}

	public async exec(msg: Message, { user }: { user: User }) {
		const findThread = await Thread.findOne({ thread_id: msg.channel.id, closed: false });
		if (!findThread) return msg.channel.send("This channel either isn't a ticket or is closed!");

		findThread.subscribed.push(user.id);
		await findThread.save();

		return msg.channel.send(`Subscribed ${user} to this thread.`);
	}
}

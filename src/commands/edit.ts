import { Command } from 'discord-akairo';
import { Message, SnowflakeUtil as SU } from 'discord.js';
import Thread from '../schemas/Thread';
import { createReplyEmbed } from '../util';

export default class Edit extends Command {
	public constructor() {
		super('edit', {
			aliases: ['edit'],
			ratelimit: 2,
			cooldown: 20000,
			args: [
				{
					id: 'newContent',
					type: 'string',
					match: 'rest'
				}
			],
			channel: 'guild',
			description: {
				content: 'Edit the last message sent to this person in the ticket.',
				usage: ['<newContent>'],
				example: ['Whoops, made a typo here is the new content!!!']
			}
		});
	}

	public async exec(msg: Message, { newContent }: { newContent?: string }) {
		if (!newContent) return msg.channel.send('You must provide a message content to edit.');
		const fetchThread = await Thread.findOne({ thread_id: msg.channel.id });
		if (!fetchThread) return msg.channel.send('This channel is not a ticket!');

		const opener = await this.client.users.fetch(fetchThread.author_id).catch(() => null);
		if (!opener) return msg.channel.send("Can't fetch that user...");

		const channel = await opener.createDM();
		const lastReplyMessage = fetchThread.bot_messages.sort(
			(a, b) => SU.deconstruct(b).date.getTime() - SU.deconstruct(a).date.getTime()
		)[0];
		if (!lastReplyMessage)
			return msg.channel.send("You haven't sent any messages to them that I can edit!");

		const lastMessage = await channel.messages.fetch(lastReplyMessage).catch(() => null);
		if (!lastMessage) return msg.channel.send('There are no messages between you and this member.');

		const newEmbed = createReplyEmbed(msg, newContent);
		await lastMessage.edit(newEmbed);
		return msg.channel.send('Successfully edited message', {
			embed: newEmbed
		});
	}
}

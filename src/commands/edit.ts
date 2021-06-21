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
					id: 'messageID',
					type: 'string',
					match: 'option',
					flag: '--id='
				},
				{
					id: 'newContent',
					type: 'string',
					match: 'rest'
				}
			],
			channel: 'guild',
			description: {
				content: 'Edit the last message sent to this person in the ticket.',
				usage: ['[--id=message-id] <newContent>'],
				example: ['Whoops, made a typo here is the new content!!!']
			},
			userPermissions: ['KICK_MEMBERS']
		});
	}

	public async exec(msg: Message, { messageID, newContent }: { messageID?: string; newContent?: string }) {
		if (!newContent) return msg.channel.send('You must provide content to edit your message to.');
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

		const lastMessage = await channel.messages
			.fetch(messageID ? messageID.toString() : lastReplyMessage)
			.catch(() => null);
		if (!lastMessage) {
			if (messageID)
				return msg.channel.send(
					"Could not find that specified message! Are you sure that's the correct ID?"
				);
			return msg.channel.send('There are no messages between you and this member.');
		}

		if (!lastMessage.author.bot || lastMessage.author.id !== lastMessage.client.user!.id)
			return msg.channel.send('I did not send this message, therefore I cannot edit it!');

		const newEmbed = createReplyEmbed(msg, newContent);
		try {
			await lastMessage.edit(newEmbed);
			return msg.channel.send('Successfully edited message', {
				embed: newEmbed
			});
		} catch (e) {
			return msg.channel.send(
				'That user has DMs disabled, cannot edit message! Please reach out to them directly.'
			);
		}
	}
}

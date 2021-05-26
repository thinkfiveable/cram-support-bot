import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import Thread from '../schemas/Thread';
import { createReplyEmbed, extractMessageAttachmentsIntoArray } from '../util';

export default class Reply extends Command {
	public constructor() {
		super('reply', {
			aliases: ['reply'],
			ratelimit: 2,
			cooldown: 20000,
			args: [
				{
					id: 'content',
					type: 'string',
					match: 'rest'
				}
			],
			channel: 'guild',
			description: {
				content: 'Reply to a ticket in a ticket channel. If it is closed, replying will reopen it.',
				usage: ['<content>'],
				example: ["Hi, I'm here to help you!"]
			}
		});
	}

	public async exec(msg: Message, { content }: { content?: string }) {
		if (!content) return msg.channel.send('Must supply a message to send to ticket author.');

		const ticket = await Thread.findOne({ thread_id: msg.channel.id });
		if (!ticket) return msg.channel.send('This channel does not belong to a ticket.');

		const opener = await this.client.users.fetch(ticket.author_id);
		if (ticket.closed) ticket.closed = false;

		ticket.messages.push({
			content: content,
			msg_author_id: msg.author.id,
			msg_id: msg.id
		});

		const sentEmbed = createReplyEmbed(msg, content);

		try {
			const sentMessage = await opener.send({
				embed: sentEmbed,
				files: extractMessageAttachmentsIntoArray(msg)
			});
			ticket.bot_messages.push(sentMessage.id);
			await ticket.save();

			return msg.channel.send(sentEmbed.setFooter(`Message ID: ${sentMessage.id}`));
		} catch (e) {
			return msg.channel.send(
				'There was an error sending your message to this user. They might have DMs disabled! Please reach out to them yourself.'
			);
		}
	}
}

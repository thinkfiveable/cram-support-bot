import { Command } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';
import Thread from '../schemas/Thread';

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
					match: 'rest',
				},
			],
			channel: 'guild',
			description: {
				content: 'Reply to a ticket in a ticket channel. If it is closed, replying will reopen it.',
				usage: ['<content>'],
				example: ["Hi, I'm here to help you!"],
			},
		});
	}

	public async exec(msg: Message, { content }: { content: string }) {
		if (!content) return msg.channel.send('Must supply a message to send to ticket author.');

		const ticket = await Thread.findOne({ thread_id: msg.channel.id });
		if (!ticket) return msg.channel.send('This channel does not belong to a ticket.');

		const opener = await this.client.users.fetch(ticket.author_id);
		if (ticket.closed) ticket.closed = false;

		ticket.messages.push({
			content: content,
			msg_author_id: msg.author.id,
			msg_id: msg.id,
		});

		const sent_embed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setDescription(content)
			.setTimestamp()
			.setColor('YELLOW');
		await opener.send(sent_embed);
		await ticket.save();

		return msg.channel.send(sent_embed);
	}
}

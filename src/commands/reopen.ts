import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { messageFormatTicket } from '../util';
import { Message, MessageEmbed } from 'discord.js';
import Thread from '../schemas/Thread';

export default class ReOpen extends Command {
	public constructor() {
		super('reopen', {
			aliases: ['reopen', 're-open'],
			ratelimit: 2,
			cooldown: 20000,
			args: [
				{
					id: 'ticketID',
					type: 'string',
				},
			],
			channel: 'guild',
			description: {
				content: 'Reopen a ticket.',
				usage: ['<id>'],
				example: ['', '<absd823749>'],
			},
		});
	}

	public async exec(msg: Message, { ticketID }: { ticketID: string }) {
		// allow people to run this command in either the ticket channel itself or another one and target the channel
		const ticket = await Thread.findById(ticketID);

		if (!ticket) return msg.channel.send(`Cannot locate ticket by ID.`);
		ticket.closed = false;
		// open ticket
		await ticket.save();

		// create a channel for their ticket
		const channel = await this.client.guild!.channels.create(
			`support-${msg.author.username}-${msg.author.discriminator}`,
			{
				parent: this.client.modMailCategory!.id,
				reason: 'New Support Thread.',
				topic: `Support thread for ${msg.author.tag} (${msg.author.id})`,
			},
		);

		// sync this channel with the category
		await channel.lockPermissions();
		const [opener, responders, MESSAGE_LOG] = await messageFormatTicket(this.client, ticket);

		await channel.send(
			new MessageEmbed()
				.setTitle('Re-opened Thread...')
				.setColor('#36393E')
				.setDescription(
					stripIndents`
					**Opener:** ${opener}
					**First Name:** \`${ticket.data.first_name}\`
					**Last Name:** \`${ticket.data.last_name}\`
					**Order ID:** \`${ticket.data.order_id ?? 'n/a'}\`
					**Email:** \`${ticket.data.email}\`
					**Zip Code:** \`${ticket.data.zip_code}\`
					**Issue:** \`${ticket.data.issue}\`
					**Responders:** \`${responders.map((x, id) => (x ? `\`${x.tag} (${x.id})\`` : `\`UNKNOWN (${id})\``))}\`

					**Messages:**
					${MESSAGE_LOG.length > 1200 ? `${MESSAGE_LOG.substring(0, 1200)}...` : MESSAGE_LOG}
					`,
				)
				.setFooter(`Ticket ID: ${ticket._id}`),
		);
		ticket.thread_id = channel.id;
		// resave ticket with created channel id
		await ticket.save();

		return msg.channel.send('Ticket has been roepened.');
	}
}

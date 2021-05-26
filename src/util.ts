import { MessageEmbed } from 'discord.js';
import { Collection, Client, User, BufferResolvable, Message, SnowflakeUtil } from 'discord.js';
import { ThreadSchema } from './schemas/Thread';

export async function messageFormatTicket(
	client: Client,
	ticket: ThreadSchema
): Promise<[User, Collection<string, User | null>, string]> {
	// get ticket opener
	const opener = await client.users.fetch(ticket.author_id);

	// get the ids of all the staff members who participated in the ticket
	const responderIDs = new Set(ticket.messages.map((x) => x.msg_author_id));
	const responders = new Collection<string, User | null>();

	// add ticket opener to responders list
	responders.set(opener.id, opener);

	// get user object of all staff members that participated
	responderIDs.forEach(async (responder) => {
		if (responder === opener.id) return;
		responders.set(responder, await client.users.fetch(responder).catch(() => null));
	});

	// format message like "STAFF_MEMBER: MESSAGE THEY SENT HERE"
	return [
		opener,
		responders,
		ticket.messages
			.map(
				(x) =>
					`${responders.get(x.msg_author_id)?.tag ?? 'UNKNOWN'} (${SnowflakeUtil.deconstruct(
						x.msg_id
					)
						.date.toString()
						.substring(4, 33)}): ${x.content}`
			)
			.join('\n')
	];
}

export function respondersFormat(users: Collection<string, User | null>) {
	return users.map((x, id) => (x ? `\`${x.tag} (${x.id})\`` : `\`UNKNOWN (${id})\``));
}

export function extractMessageAttachmentsIntoArray(m: Message) {
	// send all attachments with the message.
	const SERIALIZED_ATTACHMENTS: { attachment: BufferResolvable; name: string }[] = [];
	for (const { attachment, name } of m.attachments.values()) {
		// if (!['jpg', 'jpeg', 'png', 'gif', 'mp4'].some((x) => name?.endsWith(x))) continue;
		SERIALIZED_ATTACHMENTS.push({ attachment: attachment as BufferResolvable, name: name ?? 'NO_NAME' });
	}

	return SERIALIZED_ATTACHMENTS;
}

export function createReplyEmbed(m: Message, content: string) {
	return new MessageEmbed()
		.setAuthor(m.author.tag, m.author.displayAvatarURL())
		.setDescription(content)
		.setTimestamp()
		.setColor('YELLOW');
}

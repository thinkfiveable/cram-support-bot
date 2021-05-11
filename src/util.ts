import { Collection, Client, User } from 'discord.js';
import { ThreadSchema } from './schemas/Thread';

export async function messageFormatTicket(
	client: Client,
	ticket: ThreadSchema,
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
		ticket.messages.map((x) => `\`${responders.get(x.msg_author_id)?.tag ?? 'UNKNOWN'}: ${x.content}\``).join('\n'),
	];
}

export function respondersFormat(users: Collection<string, User | null>) {
	return users.map((x, id) => (x ? `\`${x.tag} (${x.id})\`` : `\`UNKNOWN (${id})\``));
}
import { Listener } from 'discord-akairo';
import { Client, MessageEmbed, Message, Util, User, TextChannel } from 'discord.js';
import Thread from '../schemas/Thread';
import { stripIndents } from 'common-tags';
import * as EmailValidator from 'email-validator';

export default class MessageListener extends Listener {
	public sessions = new Set<string>();

	public constructor() {
		super('message', {
			emitter: 'client',
			event: 'message',
		});
	}

	public async exec(message: Message) {
		if (message.guild || message.author.bot || !message.content || this.sessions.has(message.author.id)) return;

		const findThread = await Thread.findOne({ author_id: message.author.id, closed: false });
		if (!findThread) return this.createThread(message);

		const threadChannel =
			(findThread.thread_id && (this.client.channels.cache.get(findThread.thread_id) as TextChannel)) ?? null;

		if (!threadChannel) {
			await message.channel.send(
				new MessageEmbed()
					.setColor('RED')
					.setTitle('Error!')
					.setDescription(
						"You have an open ticket, but I cannot find it's respective thread. I am closing this ticket, if you still need help please feel free to open another ticket or DM a staff member!",
					),
			);
			findThread.closed = true;
			return findThread.save();
		}

		const SERIALIZED_ATTACHMENTS = [];
		for (const { attachment, name } of message.attachments.values()) {
			if (!['jpg', 'jpeg', 'png', 'gif', 'mp4'].some((x) => name?.endsWith(x))) continue;
			SERIALIZED_ATTACHMENTS.push({ attachment, name: name ?? 'NO_NAME' });
		}

		try {
			await threadChannel.send('New Ticket Message', {
				embed: new UserEmbed(message.author)
					.setDescription(message.content)
					.setFooter(`Message ID: ${message.id}`)
					.setTimestamp(),
				files: SERIALIZED_ATTACHMENTS,
			});
			findThread.messages.push({
				msg_author_id: message.author.id,
				content: Util.escapeMarkdown(message.content),
				msg_id: message.id,
			});
			await findThread.save();
			return message.channel.send('`Your message has been sent in! We will respond shortly...`');
		} catch (e) {
			console.log(e);
			return message.channel.send('There was an issue sending in your message, please contact a staff member!');
		}
	}

	private async createThread(m: Message) {
		try {
			this.client.info(`[Thread] creation process started for ${m.author.tag} (${m.author.id})`);
			this.sessions.add(m.author.id);
			await m.channel.send(
				'Hello! Welcome to the Fiveable Cram Support bot! Please be sure to answer the following questions below in a timely fashion.',
			);
			const PROMPT_ORDER_INDICATION = await this.promptString(m, 'Do you have an order ID? (y/n)');

			let PROMPT_ORDER_ID: string | undefined;
			let PROMPT_FIRST_NAME: string | undefined;
			let PROMPT_LAST_NAME: string | undefined;
			let PROMPT_EMAIL: string | undefined;
			let PROMPT_ZIP_CODE: string | undefined;
			let PROMPT_ISSUE: string | undefined;

			if (/^y(?:e(?:a|s)?)?$/i.test(PROMPT_ORDER_INDICATION ?? '')) {
				PROMPT_ORDER_ID = await this.promptQuestion(m, 'order ID');
			}

			PROMPT_FIRST_NAME = await this.promptQuestion(m, 'FIRST name');
			PROMPT_LAST_NAME = await this.promptQuestion(m, 'LAST name');
			PROMPT_EMAIL = await this.promptQuestion(m, 'email');
			if (!EmailValidator.validate(PROMPT_EMAIL))
				return this.reject(m, 'Not a valid email! Cancelling ticket...');

			PROMPT_ZIP_CODE = await this.promptQuestion(m, 'zip code');
			if (!/^\d{5}(?:[-\s]\d{4})?$/.test(PROMPT_ZIP_CODE))
				return this.reject(m, 'Not a valid zip code! Cancelling ticket...');

			PROMPT_ISSUE = await this.promptString(m, "What's the issue you are facing?");
			if ((PROMPT_ISSUE?.length ?? 0) > 1200) return this.reject(m, 'Too long! Cancelling ticket...');
			PROMPT_ISSUE = Util.escapeMarkdown(PROMPT_ISSUE!);

			this.client.info(`[Thread] data received from ${m.author.tag} (${m.author.id})`);

			const NEW_THREAD = new Thread({
				author_id: m.author.id,
				data: {
					first_name: PROMPT_FIRST_NAME,
					last_name: PROMPT_LAST_NAME,
					order_id: PROMPT_ORDER_ID ?? null,
					email: PROMPT_EMAIL,
					zip_code: PROMPT_ZIP_CODE,
					issue: PROMPT_ISSUE,
				},
			});

			const SAVED_THREAD = await NEW_THREAD.save();
			this.client.info(`[Thread] created ${SAVED_THREAD._id} for ${m.author.tag} (${m.author.id})`);

			await this.client
				.guild!.channels.create(`support-${m.author.username}-${m.author.discriminator}`, {
					parent: this.client.modMailCategory!.id,
					reason: 'New Support Thread.',
					topic: `Support thread for ${m.author.tag} (${m.author.id})`,
				})
				.then(async (channel) => {
					await channel.lockPermissions();
					this.client.info(`[Thread] Support Channel created for ${m.author.tag} (${m.author.id})`);
					await channel.send(
						new MessageEmbed()
							.setTitle('New Support Thread...')
							.setColor('#36393E')
							.setDescription(
								stripIndents`
								**First Name:** \`${PROMPT_FIRST_NAME}\`
								**Last Name:** \`${PROMPT_LAST_NAME}\`
								**Order ID:** \`${PROMPT_ORDER_ID ?? 'n/a'}\`
								**Email:** \`${PROMPT_EMAIL}\`
								**Zip Code:** \`${PROMPT_ZIP_CODE!}\`
								**Issue:** \`${PROMPT_ISSUE}\`
								`,
							)
							.setFooter(`Ticket ID: ${SAVED_THREAD._id}`),
					);
					SAVED_THREAD.thread_id = channel.id;
					return SAVED_THREAD.save();
				});

			this.sessions.delete(m.author.id);
			return m.channel.send(
				"`Your ticket has been sent in! A Student Success team member will be with you shortly! If you have any more messages to say, just say them below and they'll be relayed to our team!`",
			);
		} catch (e) {
			this.sessions.delete(m.author.id);
			void m.channel.send(new MessageEmbed().setTitle('Error!').setDescription(e.toString()).setTimestamp());
			return console.log(e);
		}
	}

	public async promptQuestion(m: Message, item: string): Promise<string> {
		const input = await this.promptString(m, `What is your ${item}?`);
		if (!input)
			throw new Error(
				'You ran out of time to answer this question! Cancelling ticket creation... Feel free to open another ticket by sending a message here...',
			);
		if (input.length > 75) this.reject(m, 'Too long! Cancelling ticket...');
		if (input.toLowerCase() === 'cancel') throw new Error('Cancelled.');

		return input;
	}

	public reject(msg: Message, content: string) {
		this.sessions.delete(msg.author.id);
		throw new Error(content);
	}

	private async promptString(m: Message, title: string) {
		await m.channel.send(new PromptEmbed(m.client).setTitle(title));
		const prompt = await m.channel
			.awaitMessages((pM: Message) => pM.author.id === m.author.id, {
				max: 1,
				time: 60000,
				errors: ['time'],
			})
			.then((x) => x.first())
			.catch((x) => x.first());
		return prompt?.content;
	}
}

class PromptEmbed extends MessageEmbed {
	public constructor(client: Client) {
		super();
		this.setColor('YELLOW');
		this.setTimestamp();
		this.setFooter('Fiveable Cram Support', client.user!.displayAvatarURL());
	}
}

class UserEmbed extends MessageEmbed {
	public constructor(user: User) {
		super();
		this.setColor('BLUE');
		this.setTimestamp();
		this.setAuthor(`${user.tag} (${user.id})`, user.displayAvatarURL());
	}
}

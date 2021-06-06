import { Listener } from 'discord-akairo';
import { Client, MessageEmbed, Message, Util, User, TextChannel } from 'discord.js';
import Thread from '../schemas/Thread';
import { stripIndents } from 'common-tags';
import * as EmailValidator from 'email-validator';
import { extractMessageAttachmentsIntoArray } from '../util';
import Guild from '../schemas/Guild';
import { MessageReaction } from 'discord.js';

/*
- Reaction rating after ticket gets closed (non-silent only)
- More complex pathways/prompting for questions related to ticket creation.
- Try to use more reaction emojis for Y/N questions
- Confirmation before sending in 
 */

export default class MessageListener extends Listener {
	// store if people are in the middle of the questionaire already
	public sessions = new Set<string>();
	public static THUMBS_UP = '👍';
	public static THUMBS_DOWN = '👎';

	public constructor() {
		super('message', {
			emitter: 'client',
			event: 'message'
		});
	}

	public async exec(message: Message) {
		if (message.guild) {
			if (message.content === 'order corn' && message.member?.hasPermission('MANAGE_MESSAGES'))
				return message.channel.send('ALEXA ORDER CORN!!!');
		}

		// only execute in dms, non bot users, that send a message with content, and aren't already doing the questionaire
		if (message.guild || message.author.bot || !message.content || this.sessions.has(message.author.id))
			return;

		const mainGuild = await Guild.findById(this.client.guild!.id);
		if (mainGuild?.blocklist.includes(message.author.id)) return;

		// find existing ticket
		const findThread = await Thread.findOne({ author_id: message.author.id, closed: false });
		// if no existing ticket, then create one
		if (!findThread) return this.createThread(message);

		// get ticket channel in server
		const threadChannel =
			(findThread.thread_id && (this.client.channels.cache.get(findThread.thread_id) as TextChannel)) ??
			null;

		// only time this channel wouldn't be avaliable is if someone deleted it manually. We close the ticket for the person.
		if (!threadChannel) {
			await message.channel.send(
				new MessageEmbed()
					.setColor('RED')
					.setTitle('Error!')
					.setDescription(
						'You have an open ticket, but I cannot find its respective thread. I am closing this ticket, if you still need help please feel free to open another ticket or DM a staff member!'
					)
			);
			findThread.closed = true;
			return findThread.save();
		}

		const SERIALIZED_ATTACHMENTS = extractMessageAttachmentsIntoArray(message);

		try {
			// send users message to their ticket channel
			await threadChannel.send(
				findThread.subscribed.length
					? `${findThread.subscribed
							.map((x) => `<@${x}>`)
							.join(
								' '
							)}, we just got a message, we just got a message, we just got a message I wonder who it's from...`
					: '',
				{
					embed: new UserEmbed(message.author)
						.setDescription(message.content)
						.setFooter(`Message ID: ${message.id}`)
						.setTimestamp(),
					files: SERIALIZED_ATTACHMENTS
				}
			);
			// log this message data
			findThread.messages.push({
				msg_author_id: message.author.id,
				content: Util.escapeMarkdown(message.content),
				msg_id: message.id
			});
			await findThread.save();
			return message.channel.send('`Your message has been sent in! We will respond shortly...`');
		} catch (e) {
			console.log(e);
			return message.channel.send(
				'There was an issue sending in your message, please contact a staff member!'
			);
		}
	}

	private async createThread(m: Message) {
		try {
			this.client.info(`[Thread] creation process started for ${m.author.tag} (${m.author.id})`);
			// stop another session from starting by adding them to a set
			this.sessions.add(m.author.id);
			await m.channel.send(
				'Hello! Welcome to the Fiveable Cram Support bot! Please be sure to answer the following questions below in a timely fashion.'
			);

			let PROMPT_ORDER_ID: string | undefined;

			if (await this.promptYNReaction(m, 'Do you have an order ID?')) {
				// get order ID
				PROMPT_ORDER_ID = await this.promptQuestion(m, 'order ID');
			}

			// get first name
			const PROMPT_FIRST_NAME = await this.promptQuestion(m, 'FIRST name');
			// get last name
			const PROMPT_LAST_NAME = await this.promptQuestion(m, 'LAST name');
			// get email
			const PROMPT_EMAIL = await this.promptQuestion(m, 'email');
			// check that email is valid
			if (!EmailValidator.validate(PROMPT_EMAIL)) return this.reject(m, 'Not a valid email!');

			// get zip code
			const PROMPT_ZIP_CODE = await this.promptQuestion(
				m,
				'zip code',
				"This information will be used to verify your purchase if your purchase order ID doesn't match up, or if you don't have the ID on hand right now."
			);
			// validate zip code
			if (!/^\d{5}(?:[-\s]\d{4})?$/.test(PROMPT_ZIP_CODE))
				return this.reject(m, 'Not a valid zip code!');

			// get what their issue is
			let PROMPT_ISSUE: string = await this.promptString(m, "What's the issue you are facing?");
			if (PROMPT_ISSUE.length > 1200) return this.reject(m, 'Too long!');
			// escape any kind of styling they might have tried to apply
			PROMPT_ISSUE = Util.escapeMarkdown(PROMPT_ISSUE);

			if (
				!(await this.promptYNReaction(
					m,
					'You are about to send this information to the Student Success team. Is this information correct?',
					stripIndents`
						**First Name:** \`${PROMPT_FIRST_NAME}\`
						**Last Name:** \`${PROMPT_LAST_NAME}\`
						**Order ID:** \`${PROMPT_ORDER_ID ?? 'n/a'}\`
						**Email:** \`${PROMPT_EMAIL}\`
						**Zip Code:** \`${PROMPT_ZIP_CODE}\`
						**Issue:** \`${PROMPT_ISSUE}\`
					`
				))
			)
				return this.reject(m, null);

			this.client.info(`[Thread] data received from ${m.author.tag} (${m.author.id})`);

			// save ticket to mongodb
			const newThread = new Thread({
				author_id: m.author.id,
				data: {
					first_name: PROMPT_FIRST_NAME,
					last_name: PROMPT_LAST_NAME,
					order_id: PROMPT_ORDER_ID ?? null,
					email: PROMPT_EMAIL,
					zip_code: PROMPT_ZIP_CODE,
					issue: PROMPT_ISSUE
				}
			});

			const savedThread = await newThread.save();
			this.client.info(`[Thread] created ${savedThread._id} for ${m.author.tag} (${m.author.id})`);

			// create a channel for their ticket
			const channel = await this.client.guild!.channels.create(
				`support-${m.author.username.substring(0, 9)}-${m.author.discriminator}`,
				{
					parent: this.client.modMailCategory!.id,
					reason: 'New Support Thread.',
					topic: `Support thread for ${m.author.tag} (${m.author.id})`
				}
			);

			// sync this channel with the category
			await channel.lockPermissions();
			this.client.info(`[Thread] Support Channel created for ${m.author.tag} (${m.author.id})`);
			// send initial message
			await channel.send(
				this.client.config.ROLE_PING ? `<@&${this.client.config.ROLE_PING}>` : '',
				new MessageEmbed()
					.setTitle('New Support Thread...')
					.setColor('#36393E')
					.setDescription(
						stripIndents`
						**Opener:** ${m.author} (${m.author.id})
						**First Name:** \`${PROMPT_FIRST_NAME}\`
						**Last Name:** \`${PROMPT_LAST_NAME}\`
						**Order ID:** \`${PROMPT_ORDER_ID ?? 'n/a'}\`
						**Email:** \`${PROMPT_EMAIL}\`
						**Zip Code:** \`${PROMPT_ZIP_CODE}\`
						**Issue:** \`${PROMPT_ISSUE}\`
						`
					)
					.setFooter(`Ticket ID: ${savedThread._id}`)
			);
			savedThread.thread_id = channel.id;
			// resave ticket with created channel id
			await savedThread.save();

			// end this session
			this.sessions.delete(m.author.id);
			return m.channel.send(
				new MessageEmbed()
					.setColor('GREEN')
					.setTitle('Ticket Successfully Received!')
					.setDescription(
						'A Student Success team member will be with you shortly.\nIf you have any more question, all additional messages you send will be relayed to our team!'
					)
			);
		} catch (e) {
			// if there was an error, end the session to prevent hanging
			this.sessions.delete(m.author.id);
			void m.channel.send(
				new MessageEmbed()
					.setTitle('Error!')
					.setDescription(
						`${
							e.message ? `${e.message} ` : ''
						}Ticket has been cancelled. If you still need assisstance, feel free to send another message to restart the ticketing process.`
					)
					.setTimestamp()
			);
			return console.log(e);
		}
	}

	public async promptQuestion(m: Message, item: string, description?: string): Promise<string> {
		const input = await this.promptString(m, `What is your ${item}?`, description);
		// input will only be blank if a person does not answer in time
		if (!input) throw new Error('You ran out of time to answer this question!');
		// if input is too long
		if (input.length > 75) this.reject(m, 'Too long!');
		// if someone says cancel at all, stop creation.
		if (input.toLowerCase() === 'cancel') throw new Error('Cancelled.');

		return input;
	}

	public reject(msg: Message, content: string | null) {
		this.sessions.delete(msg.author.id);
		throw new Error(content ?? undefined);
	}

	private async promptYNReaction(m: Message, question: string, description?: string) {
		const sentMessage = await m.channel.send(
			new PromptEmbed(m.client).setTitle(question).setDescription(description ?? '')
		);

		await sentMessage.react(MessageListener.THUMBS_UP);
		await sentMessage.react(MessageListener.THUMBS_DOWN);

		const reaction = await sentMessage.awaitReactions(
			(reaction: MessageReaction, user: User) =>
				[MessageListener.THUMBS_DOWN, MessageListener.THUMBS_UP].includes(reaction.emoji.name) &&
				user.id === m.author.id,
			{
				max: 1,
				time: 30000
			}
		);

		if (!reaction.size) this.reject(m, 'You did not react in time!');

		return reaction.first()?.emoji.name === MessageListener.THUMBS_UP;
	}

	private async promptString(m: Message, title: string, description?: string) {
		// prompt and ask for input
		await m.channel.send(new PromptEmbed(m.client).setTitle(title).setDescription(description ?? ''));
		const prompt = await m.channel
			.awaitMessages((pM: Message) => pM.author.id === m.author.id, {
				max: 1,
				time: 60000,
				errors: ['time']
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

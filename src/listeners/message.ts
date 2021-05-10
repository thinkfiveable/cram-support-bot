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

		const FindThread = await Thread.findOne({ author_id: message.author.id, closed: false });
		if (!FindThread) return this.createThread(message);

		const ThreadChannel =
			(FindThread.thread_id && (this.client.channels.cache.get(FindThread.thread_id) as TextChannel)) ?? null;

		if (!ThreadChannel) {
			await message.channel.send(
				new MessageEmbed()
					.setColor('RED')
					.setTitle('Error!')
					.setDescription(
						"You have an open ticket, but I cannot find it's respective thread. I am closing this ticket, if you still need help please feel free to open another ticket or DM a staff member!",
					),
			);
			FindThread.closed = true;
			return FindThread.save();
		}

		try {
			await ThreadChannel.send(
				new UserEmbed(message.author)
					.setDescription(message.content)
					.setFooter(`Message ID: ${message.id}`)
					.setTimestamp(),
			);
			FindThread.messages.push({
				msg_author_id: message.author.id,
				content: Util.escapeMarkdown(message.content),
				msg_id: message.id,
			});
			await FindThread.save();
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
			const prompt_order_indication = await this.promptString(m, 'Do you have an order ID? (y/n)');

			let prompt_order_id: string | undefined;
			let prompt_first_name: string | undefined;
			let prompt_last_name: string | undefined;
			let prompt_email: string | undefined;
			let prompt_zip_code: string | undefined;
			let prompt_issue: string | undefined;

			if (/^y(?:e(?:a|s)?)?$/i.test(prompt_order_indication ?? '')) {
				prompt_order_id = await this.promptQuestion(m, 'order ID');
			}

			prompt_first_name = await this.promptQuestion(m, 'FIRST name');
			prompt_last_name = await this.promptQuestion(m, 'LAST name');
			prompt_email = await this.promptQuestion(m, 'email');
			if (!EmailValidator.validate(prompt_email))
				return this.reject(m, 'Not a valid email! Cancelling ticket...');

			prompt_zip_code = await this.promptQuestion(m, 'zip code');
			if (!/^\d{5}(?:[-\s]\d{4})?$/.test(prompt_zip_code))
				return this.reject(m, 'Not a valid zip code! Cancelling ticket...');

			prompt_issue = await this.promptString(m, "What's the issue you are facing?");
			if ((prompt_issue?.length ?? 0) > 1200) return this.reject(m, 'Too long! Cancelling ticket...');
			prompt_issue = Util.escapeMarkdown(prompt_issue!);

			this.client.info(`[Thread] data received from ${m.author.tag} (${m.author.id})`);

			const NewThread = new Thread({
				author_id: m.author.id,
				data: {
					first_name: prompt_first_name,
					last_name: prompt_last_name,
					order_id: prompt_order_id ?? null,
					email: prompt_email,
					zip_code: prompt_zip_code,
					issue: prompt_issue,
				},
			});

			const SavedThread = await NewThread.save();
			this.client.info(`[Thread] created ${SavedThread._id} for ${m.author.tag} (${m.author.id})`);

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
								**First Name:** \`${prompt_first_name}\`
								**Last Name:** \`${prompt_last_name}\`
								**Order ID:** \`${prompt_order_id ?? 'n/a'}\`
								**Email:** \`${prompt_email}\`
								**Zip Code:** \`${prompt_zip_code!}\`
								**Issue:** \`${prompt_issue}\`
								`,
							)
							.setFooter(`Ticket ID: ${SavedThread._id}`),
					);
					SavedThread.thread_id = channel.id;
					return SavedThread.save();
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
			.awaitMessages((p_m: Message) => p_m.author.id === m.author.id, {
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

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
		if (message.guild) return;
		if (message.author.bot) return;

		if (this.sessions.has(message.author.id)) return;
		const FindThread = await Thread.findOne({ author_id: message.author.id, closed: false });
		if (!FindThread) return this.CreateThread(message);

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
			await ThreadChannel.send(new UserEmbed(message.author).setDescription(message.content));
			FindThread.messages.push({
				msg_author_id: message.author.id,
				content: message.content,
				msg_id: message.id,
			});
			await FindThread.save();
			return message.channel.send('`Your message has been sent in! We will respond shortly...`');
		} catch (e) {
			return message.channel.send('There was an issue sending in your message, please contact a staff member!');
		}
	}

	private async CreateThread(m: Message) {
		try {
			this.client.info(`[Thread] creation process started for ${m.author.tag} (${m.author.id})`);
			this.sessions.add(m.author.id);
			await m.channel.send(
				'Hello! Welcome to the Fiveable Cram Support bot! Please be sure to answer the following questions below in a timely fashion.',
			);
			const prompt_order_indication = await this.PromptString(m, 'Do you have an order ID? (y/n)');

			let prompt_order_id: string | undefined;
			let prompt_first_name: string | undefined;
			let prompt_last_name: string | undefined;
			let prompt_email: string | undefined;
			let prompt_zip_code: string | undefined;
			let prompt_issue: string | undefined;

			if (/^y(?:e(?:a|s)?)?$/i.test(prompt_order_indication ?? '')) {
				prompt_order_id = await this.PromptString(m, "What's the order ID?");
				if (!prompt_order_id) return this.RanOutOfTime(m);
			}

			prompt_first_name = await this.PromptString(m, "What's your FIRST name?");
			if (!prompt_first_name) return this.RanOutOfTime(m);
			if (prompt_first_name.length > 75) return this.reject(m, 'Name too long! Cancelling ticket...');

			prompt_last_name = await this.PromptString(m, "What's your LAST name?");
			if (!prompt_last_name) return this.RanOutOfTime(m);
			if (prompt_last_name.length > 75) return this.reject(m, 'Name too long! Cancelling ticket...');

			prompt_email = await this.PromptString(m, "What's your email?");
			if (!prompt_email) return this.RanOutOfTime(m);
			if (prompt_email.length > 75) return this.reject(m, 'Email too long! Cancelling ticket...');
			if (!EmailValidator.validate(prompt_email))
				return this.reject(m, 'Not a valid email! Cancelling ticket...');

			prompt_zip_code = await this.PromptString(m, "What's your zip code?");
			if (!prompt_zip_code) return this.RanOutOfTime(m);
			if (prompt_zip_code.length > 10 || !/^\d{5}(?:[-\s]\d{4})?$/.test(prompt_zip_code))
				return this.reject(m, 'Not a valid zip code! Cancelling ticket...');

			prompt_issue = await this.PromptString(m, "What's the issue you are facing?");
			if (!prompt_issue) return this.RanOutOfTime(m);
			if (prompt_issue.length > 1200) return this.reject(m, 'Too long! Cancelling ticket...');

			this.client.info(`[Thread] data received from ${m.author.tag} (${m.author.id})`);

			const NewThread = new Thread({
				author_id: m.author.id,
				data: {
					first_name: prompt_first_name,
					last_name: prompt_last_name,
					order_id: prompt_order_id ?? null,
					email: prompt_email,
					zip_code: prompt_zip_code,
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
						new MessageEmbed().setTitle('New Support Thread...').setColor('#36393E')
							.setDescription(stripIndents`
                        **First Name:** \`${prompt_first_name!}\`
                        **Last Name:** \`${prompt_last_name!}\`
                        **Order ID:** \`${prompt_order_id ?? 'n/a'}\`
                        **Email:** \`${prompt_email!}\`
                        **Zip Code:** \`${prompt_zip_code!}\`
                        **Issue:** \`${Util.escapeMarkdown(prompt_issue!)}\`
                        `),
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
			void m.channel.send(
				"I'm sorry, but there was an error creating this ticket. Please let the staff know about this issue!",
			);
			return console.log(e);
		}
	}

	private RanOutOfTime(m: Message) {
		return m.channel.send(
			'You ran out of time to answer this question! Cancelling ticket creation... Feel free to open another ticket by sending a message here...',
		);
	}

	public reject(msg: Message, content: string) {
		this.sessions.delete(msg.author.id);
		return msg.channel.send(content);
	}

	private async PromptString(m: Message, title: string) {
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

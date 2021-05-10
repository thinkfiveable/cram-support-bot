import { CategoryChannel, Guild, TextChannel } from 'discord.js';
import mongoose from 'mongoose';
import { CommandHandler, ListenerHandler } from 'discord-akairo';

export interface AkClientOptions {
	ADMIN_ID: string;
	DB_URI: string;
	PREFIX: string;
	MODMAIL_CATEGORY: string;
	GUILD: string;
	MODMAIL_MAIN_CHANNEL: string;
}

declare module 'discord-akairo' {
	interface AkairoClient {
		commandHandler: CommandHandler;
		listenerHandler: ListenerHandler;
		modMailCategory?: CategoryChannel;
		modMailMainChannel?: TextChannel;
		guild?: Guild;
		db: mongoose.Connection;
		config: AkClientOptions;
		info(str: string): void;
	}
}

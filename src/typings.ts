import { CategoryChannel, Guild } from 'discord.js';
import mongoose from 'mongoose';
import { CommandHandler, ListenerHandler } from 'discord-akairo';

export interface AkClientOptions {
	ADMIN_ID: string;
	DB_URI: string;
	PREFIX: string;
	MODMAIL_CATEGORY: string;
	GUILD: string;
}

declare module 'discord-akairo' {
	interface AkairoClient {
		commandHandler: CommandHandler;
		listenerHandler: ListenerHandler;
		modMailCategory?: CategoryChannel;
		guild?: Guild;
		db: mongoose.Connection;
		config: AkClientOptions;
		info(str: string): void;
	}
}

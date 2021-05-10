import Client from './client';
import { config } from 'dotenv';
import { join } from 'path';
config({
	path: join(__dirname, '..', '.env'),
});

const envs = ['ADMIN_ID', 'DB_URI', 'PREFIX', 'TOKEN', 'MODMAIL_CATEGORY', 'GUILD', 'MODMAIL_MAIN_CHANNEL'];

for (const env of envs) {
	if (!process.env[env]) throw new Error(`Missing env variable ${env}`);
}

const client = new Client({
	ADMIN_ID: process.env.ADMIN_ID!,
	DB_URI: process.env.DB_URI!,
	PREFIX: process.env.PREFIX!,
	MODMAIL_CATEGORY: process.env.MODMAIL_CATEGORY!,
	GUILD: process.env.GUILD!,
	MODMAIL_MAIN_CHANNEL: process.env.MODMAIL_MAIN_CHANNEL!,
});

void client.login(process.env.TOKEN!);

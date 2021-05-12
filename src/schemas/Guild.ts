import { Schema, model, Document } from 'mongoose';

const guild = new Schema({
	_id: String,
	blocklist: {
		type: Array,
		default: []
	}
});

export interface GuildSchema extends Document {
	_id: string;
	blocklist: string[];
}

export default model<GuildSchema>('guild', guild);

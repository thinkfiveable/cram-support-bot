import { Schema, model, Document } from 'mongoose';

const thread = new Schema({
	author_id: {
		type: String,
		required: true,
	},
	messages: {
		type: Array,
		default: [],
	},
	thread_id: {
		type: String,
		nullable: true,
	},
	data: {
		first_name: String,
		last_name: String,
		order_id: {
			type: String,
			nullable: true,
		},
		email: String,
		zip_code: String,
	},
	step: {
		type: Number,
		default: 0,
	},
	closed: {
		type: Boolean,
		default: false,
	},
});

export interface ThreadSchema extends Document {
	_id: string;
	author_id: string;
	thread_id: string | null;
	messages: ThreadMessage[];
	data: {
		order_id: string | null;
		first_name: string;
		last_name: string;
		email: string;
		zip_code: string;
	};
	step: number;
	closed: boolean;
}

export interface ThreadMessage {
	msg_author_id: string;
	content: string;
	msg_id: string;
}

export default model<ThreadSchema>('thread', thread);

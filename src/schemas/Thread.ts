import { Schema, model, Document } from 'mongoose';

const thread = new Schema({
	// who opened the ticket
	author_id: {
		type: String,
		required: true,
	},
	// messages sent between staff members and ticket opener
	messages: {
		type: Array,
		default: [],
	},
	// created channel in server for this ticket
	thread_id: {
		type: String,
		nullable: true,
	},
	// data collected from opener
	data: {
		first_name: String,
		last_name: String,
		order_id: {
			type: String,
			nullable: true,
		},
		email: String,
		zip_code: String,
		issue: String,
	},
	step: {
		type: Number,
		default: 0,
	},
	// ticket closed or not
	closed: {
		type: Boolean,
		default: false,
	},
	subscribed: {
		type: Array,
		default: [],
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
		issue: string;
	};
	step: number;
	closed: boolean;
	subscribed: string[];
}

export interface ThreadMessage {
	msg_author_id: string;
	content: string;
	msg_id: string;
}

export default model<ThreadSchema>('thread', thread);

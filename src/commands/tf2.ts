import { Command } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';

const TF2_links = [
	'https://media.tenor.com/images/a99c4b47fee26a92b4967860ff625013/tenor.gif',
	'https://media0.giphy.com/media/IzdL5AH7teZSOPnqrw/200.gif',
	'https://media1.giphy.com/media/3RnOgm5rNhwti/200w.gif?cid=82a1493bbu92evmdahxuuku7g3xg9f1qv6ulqwt7o9zqp6k2&rid=200w.gif',
	'https://media.tenor.com/images/6cdab441aa31616f9860d65cb23ebe29/tenor.gif',
	'https://thumbs.gfycat.com/ChiefAcidicBarnacle-max-1mb.gif',
	'https://i.pinimg.com/originals/bc/37/b2/bc37b20db1aa0c73e5748f4b5a968c88.gif',
	'http://25.media.tumblr.com/75d189d5b96acadffc58fff86837ac35/tumblr_mkytninIcM1rfm892o3_250.gif',
	'https://i.gifer.com/829y.gif',
	'https://media2.giphy.com/media/GU2Ux4eZ5MGM8/200w.gif?cid=82a1493bbu92evmdahxuuku7g3xg9f1qv6ulqwt7o9zqp6k2&rid=200w.gif',
	'https://media1.tenor.com/images/733e542fcdd51bb3d4404d888e7101e9/tenor.gif?itemid=14764178',
	'https://64.media.tumblr.com/84bef7209ae60ad5e703c4df6f0889cb/tumblr_n64aslRLq61t2jw4co1_500.gifv',
	'https://media2.giphy.com/media/Z4bm0IwKEphMA/200w.gif?cid=82a1493bbu92evmdahxuuku7g3xg9f1qv6ulqwt7o9zqp6k2&rid=200w.gif',
	'https://i.kym-cdn.com/photos/images/original/000/950/892/f91.gif',
	'https://i.pinimg.com/originals/da/9d/4e/da9d4e3b30ec6f054279dd386375b4bd.gif'
];

export default class TF2 extends Command {
	public constructor() {
		super('tf2', {
			aliases: ['tf2', 'jake', 'tf'],
			ratelimit: 2,
			cooldown: 20000,
			args: [],
			channel: 'guild',
			description: {
				content: 'Random TF2 gif.',
				usage: [''],
				example: ['']
			}
		});
	}

	public async exec(msg: Message) {
		return msg.channel.send(
			new MessageEmbed().setImage(TF2_links[Math.floor(Math.random() * TF2_links.length)])
		);
	}
}

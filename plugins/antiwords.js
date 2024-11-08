import { bot } from '../lib/client/plugins.js';
import AntiWord from '../lib/db/antiword.js';

bot(
	{
		pattern: 'antiword',
		desc: 'Setup Antiword for Groups',
		type: 'group',
	},
	async (message, match, m) => {
		if (!message.isGroup) return message.sendReply('_For Groups only!_');
		if (!m.isAdmin && !m.isBotAdmin) return message.sendReply('_For Admins only!_');
		
		const groupId = message.jid;
		const antiWordConfig = await AntiWord.findOrCreate({ where: { groupId } });

		if (!match) return message.sendReply(`_${message.prefix}antiword on_\n_${message.prefix}antiword off_\n_${message.prefix}antiword set badword1,badword2_`);

		if (match === 'on') {
			if (antiWordConfig[0].isEnabled) return message.sendReply('_Antiword is already enabled for this group._');
			antiWordConfig[0].isEnabled = true;
			await antiWordConfig[0].save();
			const words = antiWordConfig[0].filterWords;
			return message.sendReply(words.length > 0 ? '_Antiword has been enabled for this group._' : '_Antiword is enabled but no bad words were set._');
		}

		if (match === 'off') {
			if (!antiWordConfig[0].isEnabled) return message.sendReply('_Antiword is already disabled for this group._');
			antiWordConfig[0].isEnabled = false;
			await antiWordConfig[0].save();
			return message.sendReply('_Antiword has been disabled for this group._');
		}

		if (match.startsWith('set ')) {
			const words = match
				.slice(4)
				.split(',')
				.map(word => word.trim());
			antiWordConfig[0].filterWords = words;
			await antiWordConfig[0].save();
			return message.sendReply(`_Antiword filter updated with words: ${words.join(', ')}_`);
		}

		return message.sendReply(`_${message.prefix}antiword on_\n_${message.prefix}antiword off_\n_${message.prefix}antiword set badword1,badword2_`);
	},
);

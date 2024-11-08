import * as baileys from 'baileys';
import { commands } from './client/plugins.js';
import { MODE, AUTO_READ, AUTO_STATUS_READ, LOGS, VERSION, SESSION_ID, CMD_REACT } from '../config.js';
import { serialize } from './serialize.js';
import Message from './class/Base.js';
import { saveChat, saveMessage, saveContact } from './db/store.js';
import { logger, numtoId } from './utils/utils.js';
import { handleAntiWord } from './client/antiword.js';
import { handleAntiLink } from './client/antilink.js';
import { useSQLiteAuthState } from './db/session.js';

const { makeWASocket, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, DisconnectReason } = baileys;

const connect = async () => {
	const { state, saveCreds, deleteSession } = await useSQLiteAuthState(SESSION_ID);
	const { version } = await fetchLatestBaileysVersion();

	const cache = new Map();
	const CACHE_TTL = 5 * 60 * 1000;
	setInterval(() => cache.clear(), CACHE_TTL);

	const conn = makeWASocket({
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		printQRInTerminal: true,
		logger,
		browser: Browsers.macOS('Desktop'),
		version,
		downloadHistory: false,
		syncFullHistory: false,
		markOnlineOnConnect: false,
		emitOwnEvents: true,
		getMessage: async key => {
			const cached = cache.get(key.id);
			if (cached) return cached;
			return { conversation: null };
		},
	});

	const handleMessage = async rawMessage => {
		const msg = await serialize(JSON.parse(JSON.stringify(rawMessage)), conn);
		if (!msg?.body) return;

		if (AUTO_READ) await conn.readMessages([msg.key]);
		if (AUTO_STATUS_READ && msg.from === 'status@broadcast') await conn.readMessages([msg.key]);

		if (LOGS) console.log(`At: ${msg.from.endsWith('@g.us') ? (await conn.groupMetadata(msg.from)).subject : msg.from}\nFrom: ${await msg.pushName}\nMessage: ${msg.body || msg}`);

		await saveMessage(msg, msg.sender);
		await saveContact(msg.sender, msg.pushName);

		async function execmd(cmd, msg, conn) {
			const Instance = new Message(conn, msg);
			try {
				if (cmd.pattern) {
					const match = msg.body.match(cmd.pattern);
					if (!match) return;
					const args = match[3] || '';
					if (CMD_REACT) await Instance.react('⌛');
					await baileys.delay(1500);
					return await cmd.function(Instance, args, msg, conn);
				} else if (cmd.on === 'text') {
					return await cmd.function(Instance, msg.body || '', msg, conn);
				} else {
					return await cmd.function(Instance, '', msg, conn);
				}
			} catch (err) {
				const user = msg.sender.split('@')[0].split(':')[0];
				const cmdName = cmd.pattern ? cmd.pattern.toString().split(/\W+/)[2] : cmd.on;
				const errMsg = `─━❲ ERROR REPORT ❳━─\nFROM: @${user}\nMESSAGE: ${err.message}\nCMD: ${cmdName}`;
				return await conn.sendMessage(msg.from, { text: '```' + errMsg + '```', mentions: [numtoId(user)] }, { quoted: msg });
			}
		}

		for (const cmd of commands) {
			if (msg.body && cmd.pattern) {
				const match = msg.body.match(cmd.pattern);
				if (match) {
					const modifiedMsg = { ...msg, prefix: match[1], command: `${match[1]}${match[2]}` };
					await execmd(cmd, modifiedMsg, conn);
					continue;
				}
			}

			if (cmd.on) {
				let shouldExecute = false;
				switch (cmd.on) {
					case 'text':
						shouldExecute = typeof msg.body === 'string' && msg.body.length > 0;
						break;
					case 'image':
						shouldExecute = msg.type === 'imageMessage';
						break;
					case 'sticker':
						shouldExecute = msg.type === 'stickerMessage';
						break;
					case 'video':
						shouldExecute = msg.type === 'videoMessage';
						break;
					case 'message':
						shouldExecute = true;
						break;
				}

				if (shouldExecute) {
					await execmd(cmd, msg, conn);
				}
			}
		}
	};

	conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
		if (connection === 'open') {
			const status = `xstro connected\nversion: ${VERSION}\nplugins: ${commands.length}\nmode: ${MODE}`;
			await conn.sendMessage(conn.user.id, { text: '```' + status + '```' });
			console.log(status);
		} else if (connection === 'close') lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut ? connect() : process.exit(0);
	});

	conn.ev.on('creds.update', saveCreds);
	conn.ev.on('chats.update', chats => chats.forEach(saveChat));
	conn.ev.on('messages.upsert', async ({ messages, type }) => {
		if (type === 'notify') {
			const msg = await serialize(JSON.parse(JSON.stringify(messages[0])), conn);
			if (msg.from && msg.body && msg.isGroup) await handleAntiWord(conn, msg);
			if (msg.from && msg.body && msg.isGroup) await handleAntiLink(conn, msg);
			await handleMessage(messages[0]);
		}
	});

	return conn;
};

export default connect;

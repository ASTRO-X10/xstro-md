import { fileTypeFromBuffer } from 'file-type';
import axios from 'axios';
import pkg from 'baileys';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { performance } from 'perf_hooks';
import pino from 'pino';
const { jidDecode } = pkg;

function handleError(error) {
	console.error('Error: ', error.message);
	throw error;
}

const logger = pino({ level: 'silent' });

async function getBuffer(url, options = {}) {
	const res = await axios({
		method: 'get',
		url,
		headers: { DNT: 1, 'Upgrade-Insecure-Request': 1 },
		...options,
		responseType: 'arraybuffer',
	}).catch(handleError);
	return res.data;
}

const decodeJid = jid => {
	if (!jid) return jid;
	if (/:\d+@/gi.test(jid)) {
		const decode = jidDecode(jid) || {};
		return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
	} else {
		return jid;
	}
};

async function FiletypeFromUrl(url) {
	const buffer = await getBuffer(url);
	const out = await fileTypeFromBuffer(buffer).catch(handleError);
	let type = out ? out.mime.split('/')[0] : null;
	return { type, buffer };
}

function extractUrlFromMessage(message) {
	const urlRegex = /(https?:\/\/[^\s]+)/gi;
	const match = urlRegex.exec(message);
	return match ? match[0] : null;
}

async function getJson(url, options) {
	const res = await axios({
		method: 'GET',
		url,
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
		},
		...options,
	}).catch(handleError);
	return res.data;
}

const postJson = async (url, options) => {
	const { data, headers = {} } = options;
	const response = await axios
		.post(url, data, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
				...headers,
			},
		})
		.catch(handleError);
	return response.data;
};

function parseJid(text = '') {
	return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
}

function parsedJid(text = '') {
	return [...text.matchAll(/([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
}

function isUrl(url) {
	return new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi').test(url);
}

function getUrl(url) {
	return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.\~#?&/=]*)/, 'gi'));
}

function formatBytes(bytes, decimals = 2) {
	if (!+bytes) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function clockString(duration) {
	let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
	let minutes = Math.floor((duration / (1000 * 60)) % 60);
	let seconds = Math.floor((duration / 1000) % 60);
	return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const runtime = function (seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600 * 24));
	var h = Math.floor((seconds % (3600 * 24)) / 3600);
	var m = Math.floor((seconds % 3600) / 60);
	var s = Math.floor(seconds % 60);
	var dDisplay = d > 0 ? d + (d == 1 ? ' d ' : ' d ') : '';
	var hDisplay = h > 0 ? h + (h == 1 ? ' h ' : ' h ') : '';
	var mDisplay = m > 0 ? m + (m == 1 ? ' m ' : ' m ') : '';
	var sDisplay = s > 0 ? s + (s == 1 ? ' s' : ' s') : '';
	return dDisplay + hDisplay + mDisplay + sDisplay;
};

const getFloor = number => {
	return Math.floor(number);
};

const getRandom = array => {
	if (array.length === 0) return undefined;
	const randomIndex = Math.floor(Math.random() * array.length);
	return array[randomIndex];
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const getQueryParams = url => {
	const params = new URLSearchParams(new URL(url).search);
	return Object.fromEntries(params.entries());
};

const mergeObjects = (...objects) => {
	return Object.assign({}, ...objects);
};

const numtoId = phoneNumber => {
	const jid = phoneNumber.replace(/\D/g, '');
	return `${jid}@s.whatsapp.net`;
};

const formatDate = date => {
	const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
	return new Intl.DateTimeFormat('en-US', options).format(date);
};

const generateUUID = () => {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
};

const buffer = async url => {
	const response = await axios.get(url, { responseType: 'arraybuffer' });
	return Buffer.from(response.data);
};

const getContentBuffer = async content => {
	if (Buffer.isBuffer(content)) return content;
	if (typeof content === 'string' && content.startsWith('http')) {
		return await buffer(content);
	}
	return Buffer.from(content);
};

const ensureBuffer = async input => {
	const buffer = await getContentBuffer(input);
	if (!Buffer.isBuffer(buffer)) {
		throw new Error('Failed to convert content to a valid buffer.');
	}
	return buffer;
};

const detectMimeType = async buffer => {
	if (typeof buffer === 'string') {
		return 'text/plain';
	}
	try {
		const fileType = await fileTypeFromBuffer(buffer);
		return fileType ? fileType.mime : 'application/octet-stream';
	} catch {
		return 'application/octet-stream';
	}
};

const transformBuffer = (obj, toBuffer = false) => {
	if (Buffer.isBuffer(obj)) {
		return toBuffer ? Buffer.from(obj) : { type: 'Buffer', data: Array.from(obj) };
	}

	if (Array.isArray(obj)) {
		return obj.map(item => transformBuffer(item, toBuffer));
	}

	if (obj && typeof obj === 'object') {
		if (typeof obj.toJSON === 'function') return obj.toJSON();

		return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, transformBuffer(value, toBuffer)]));
	}

	return obj;
};

const defaultLogger = pino({ level: 'silent' });

const profile = async (name, fn, logger = defaultLogger) => {
	const start = performance.now();
	const result = await fn();
	logger.debug(`${name} took ${(performance.now() - start).toFixed(2)} ms`);
	return result;
};

const bufferToJSON = obj => {
	if (Buffer.isBuffer(obj)) {
		return { type: 'Buffer', data: Array.from(obj) };
	}
	if (Array.isArray(obj)) {
		return obj.map(bufferToJSON);
	}
	if (obj && typeof obj === 'object') {
		if (typeof obj.toJSON === 'function') {
			return obj.toJSON();
		}

		const result = {};
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				result[key] = bufferToJSON(obj[key]);
			}
		}
		return result;
	}
	return obj;
};

const jsonToBuffer = obj => {
	if (obj && obj.type === 'Buffer' && Array.isArray(obj.data)) {
		return Buffer.from(obj.data);
	}
	if (Array.isArray(obj)) {
		return obj.map(jsonToBuffer);
	}
	if (obj && typeof obj === 'object') {
		const result = {};
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				result[key] = jsonToBuffer(obj[key]);
			}
		}
		return result;
	}
	return obj;
};
export {
	FiletypeFromUrl,
	getBuffer,
	extractUrlFromMessage,
	decodeJid,
	parseJid,
	parsedJid,
	getJson,
	postJson,
	isUrl,
	getUrl,
	formatBytes,
	clockString,
	runtime,
	getFloor,
	getRandom,
	sleep,
	getQueryParams,
	mergeObjects,
	numtoId,
	formatDate,
	generateUUID,
	buffer,
	ensureBuffer,
	detectMimeType,
	getContentBuffer,
	transformBuffer,
	profile,
	logger,
	bufferToJSON,
	jsonToBuffer,
};

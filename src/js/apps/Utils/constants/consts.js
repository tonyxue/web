module.exports = {
	API_URI: process.env.API_URI,
	ROOT_DOMAIN: process.env.TLD,
	DEFAULT_LANG: 'en',
	DEFAULT_KEY_LENGTH: 2048,
	ESTIMATED_KEY_GENERATION_TIME_SECONDS: 24,
	INBOX_REDIRECT_DELAY: 1000,
	BACKUP_KEYS_REDIRECT_DELAY: 1000,
	ENVELOPE_DEFAULT_MAJOR_VERSION: 1,
	ENVELOPE_DEFAULT_MINOR_VERSION: 0,
	AUTO_SAVE_TIMEOUT: 1000,
	LOADER_SHOW_DELAY: 150,
	FAST_ACTIONS_TIMEOUT: 250,
	INBOX_THREADS_CACHE_TTL: 60 * 1000,
	INBOX_EMAILS_CACHE_TTL: 60 * 1000,
	SET_READ_AFTER_TIMEOUT: 3000,
	KEYS_BACKUP_README: 'https://lavaboom.com/placeholder/help/backup-file'
};
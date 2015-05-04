module.exports = /*@ngInject*/($scope, $timeout, $translate, Key,
							   dialogs,
							   co, utils, user, crypto, cryptoKeys, LavaboomAPI, fileReader, inbox, saver, notifications) => {
	$scope.email = user.email;
	$scope.settings = {};

	$scope.form = {
		oldPassword: '',
		password: '',
		passwordRepeat: ''
	};

	const translations = {
		LB_PASSWORD_CANNOT_BE_CHANGED: '%',
		LB_PASSWORD_CHANGED: '',
		LB_LAVABOOM_SYNC_ACTIVATED: '',
		LB_LAVABOOM_SYNC_DEACTIVATED: '',
		LB_LAVABOOM_SYNC_CANNOT_UPDATE: '',
		TITLE_CONFIRM: '',
		LB_CONFIRM_PASSWORD_CHANGE: '',
		LB_CONFIRM_KEYS_REMOVAL: '',
		LB_CONFIRM_LS_DISABLE: ''
	};
	$translate.bindAsObject(translations, 'MAIN.SETTINGS.SECURITY');

	$scope.$bind('user-settings', () => {
		$scope.settings = user.settings;
	});

	$scope.$bind('keyring-updated', () => {
		$scope.keys = crypto.getAvailablePrivateKeys()
			.map(key => new Key(key))
			.sort((a, b) => {
				if (a.user < b.user) return -1;
				if (a.user > b.user) return 1;
				return 0;
			});
		$scope.isAnyUndecryptedKeys = $scope.keys.some(k => !k.isDecrypted);

		console.log('keyring-updated', $scope.keys);
	});

	$scope.changePassword = () => co(function *(){
		try {
			const confirmed = yield co.def(dialogs.confirm(translations.TITLE_CONFIRM, translations.LB_CONFIRM_PASSWORD_CHANGE).result, 'cancelled');
			if (confirmed == 'cancelled')
				return;

			yield user.updatePassword($scope.form.oldPassword, $scope.form.password);
			crypto.changePassword(user.email, $scope.form.oldPassword, $scope.form.password);

			notifications.set('password-changed-ok', {
				text: translations.LB_PASSWORD_CHANGED,
				type: 'info',
				timeout: 3000,
				namespace: 'settings'
			});
		} catch (err) {
			notifications.set('password-changed-fail', {
				text: translations.LB_PASSWORD_CANNOT_BE_CHANGED({error: err.message}),
				namespace: 'settings'
			});
		}
	});

	$scope.generateKeys = () => {
		loader.resetProgress();
		loader.showLoader(true);
		loader.loadLoginApplication({state: 'choosePasswordIntro', noDelay: true});
	};

	$scope.removeDecryptedKeys = () => co(function *(){
		const confirmed = yield co.def(dialogs.confirm(translations.TITLE_CONFIRM, translations.LB_CONFIRM_KEYS_REMOVAL).result, 'cancelled');
		if (confirmed == 'cancelled')
			return;

		crypto.removeSensitiveKeys(true);
	});

	$scope.downloadKey = (keyMeta) => {
		const key = crypto.getPublicKeyByFingerprint(keyMeta.fingerprint);
		saver.saveAs(key.armor(), user.name + '.pgp');
	};

	$scope.exportKeys = () => {
		console.log('exporting keys');
		let keysBackup = cryptoKeys.exportKeys();
		console.log('keys backup:', keysBackup);
		saver.saveAs(keysBackup, cryptoKeys.getExportFilename(keysBackup, user.name));
	};

	$scope.importKeys = (data) => {
		cryptoKeys.importKeys(data);
		inbox.invalidateEmailCache();
	};

	let updateTimeout = null;
	let isLavaboomSyncRestored = false;
	$scope.$watch('settings.isLavaboomSynced', (o, n) => {
		if (o === n || isLavaboomSyncRestored) {
			isLavaboomSyncRestored = false;
			return;
		}

		co (function *(){
			if (!$scope.settings.isLavaboomSynced) {
				const confirmed = yield co.def(dialogs.confirm(translations.TITLE_CONFIRM, translations.LB_CONFIRM_LS_DISABLE).result, 'cancelled');
				if (confirmed == 'cancelled') {
					isLavaboomSyncRestored = true;
					$scope.settings.isLavaboomSynced = true;
					return;
				}
			}

			if($scope.settings.isLavaboomSynced){
				let keysBackup = cryptoKeys.exportKeys(user.email);
				$scope.settings.keyring = keysBackup;
			}else{
				$scope.settings.keyring = '';
			}

			if (Object.keys($scope.settings).length > 0) {
				updateTimeout = $timeout.schedulePromise(updateTimeout, () => co(function *(){
					try {
						yield user.update($scope.settings);

						notifications.set('ls-ok', {
							text: $scope.settings.isLavaboomSynced ? translations.LB_LAVABOOM_SYNC_ACTIVATED : translations.LB_LAVABOOM_SYNC_DEACTIVATED,
							type: 'info',
							timeout: 3000,
							namespace: 'settings'
						});
					} catch (err) {
						notifications.set('ls-fail', {
							text: translations.LB_LAVABOOM_SYNC_CANNOT_UPDATE,
							namespace: 'settings'
						});
					}
				}), 1000);
			}
		});
	}, true);
};
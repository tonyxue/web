module.exports = /*@ngInject*/($rootScope, $scope, $stateParams, $translate, co, inbox, router) => {
	let [emailId, fileId] = [$stateParams.emailId, $stateParams.fileId];

	var translations = {};

	$scope.progress = 0;
	$scope.label = '';

	$rootScope.$bind('$translateChangeSuccess', () => {
		translations.LB_ACQUIRING = $translate.instant('INBOX.LB_ACQUIRING');
		translations.LB_DOWNLOADING = $translate.instant('INBOX.LB_DOWNLOADING');
		translations.LB_DECRYPTING = $translate.instant('INBOX.LB_DECRYPTING');
		translations.LB_TAKES_MORE = $translate.instant('INBOX.LB_TAKES_MORE');
		$scope.label = translations.LB_ACQUIRING;
	});

	console.log('downloading file. Email id', emailId, 'file id', fileId);

	co(function *(){
		let email = yield inbox.getEmail(emailId);
		console.log('downloading file from email', 'email', email);

		$scope.label = translations.LB_DOWNLOADING;
		let fileData = yield inbox.downloadAttachment(fileId);

		let manifestFile = email.manifest.getFileById(fileId);

		var blob = new Blob([fileData], {type: `${manifestFile.content_type};charset=${manifestFile.charset}`});
		saveAs(blob, manifestFile.filename);

		router.hidePopup();
	});
};
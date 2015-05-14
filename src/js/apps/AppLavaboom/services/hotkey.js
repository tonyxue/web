module.exports = /*@ngInject*/function ($rootScope, $translate, $state, $timeout, hotkeys, router, utils, consts) {
	const self = this;

	let isActive = true;
	let hotkeyList = { };
	let multiHotkeyList = {};

	self.initialize = (isEnabled) => {
		self.toggleHotkeys(isEnabled);

		$rootScope.$on('$stateChangeSuccess', (event, toState, toParams, fromState, fromParams) => {
			self.clearHotkeys();
		});
		$rootScope.$on('hotkeys-state-changed', () => {
			if (!isActive)
				self.clearHotkeys();
		});
	};

	self.getKeys = () => utils.toArray(hotkeyList);

	function removeHotkey (option) {
		console.debug('hotkeys: removed', option);

		const key = angular.isArray(option.combo) ? option.combo[0] : option.combo;
		hotkeys.del(key);
	}

	function addHotkey (option, addedFromState, isGlobal, isStep = false) {
		option = angular.copy(option);
		let combo = angular.copy(option.combo);
		const key = angular.isArray(option.combo) ? option.combo[0] : option.combo;

		if (option.require) {
			if (!multiHotkeyList[option.require])
				multiHotkeyList[option.require] = {
					isActive: false,
					list: []
				};

			multiHotkeyList[option.require].list.push({
				combo: option.combo,
				name: option.name,
				description: option.description,
				callback: option.callback
			});

			addHotkey({
				combo: [option.require],
				callback: event => {
					event.preventDefault();

					self.clearHotkeys(true);

					multiHotkeyList[option.require].isActive = true;
					for(let k of multiHotkeyList[option.require].list)
						addHotkey(k, addedFromState, isGlobal, true);

					$timeout(() => {
						multiHotkeyList[option.require].isActive = false;
						for(let k of multiHotkeyList[option.require].list)
							removeHotkey(k);

					}, consts.HOTKEY_MULTI_TIMEOUT);
				}
			}, addedFromState, isGlobal, true);
		}
		else
		{
			const currentKey = hotkeys.get(key);
			if (currentKey)
				return;

			hotkeys.add(option);
		}

		if (!isStep) {
			option.description = $translate.instant(option.description);
			hotkeyList[key] = {
				combo: combo,
				require: option.require,
				description: option.description,
				addedFromState,
				isGlobal
			};
		}

		console.debug('added hotkey', option);
	}

	self.registerCustomHotkeys = (scope, hotkeys, options) => {
		if (!options)
			options = {};

		if (!scope)
			throw new Error('hotkey.registerCustomHotkeys please define scope!');
		if (!options.scope)
			throw new Error('hotkey.registerCustomHotkeys please define scope name!');

		if (!options.isPopup)
			options.isPopup = false;
		if (!options.isGlobal)
			options.isGlobal = false;
		if (!options.addedFromState)
			options.addedFromState = $state.current.name;

		console.log('registerCustomHotkeys', options, 'isActive: ', isActive);

		function register(isFirstTime = false) {
			if (!isFirstTime && router.isPopupState($state.current.name) && !options.isPopup)
				return;

			if (!$state.current.name.includes(options.addedFromState))
				return;

			console.debug(`hotkeys: register(${options.scope}),
				current state is ${$state.current.name} added from state is ${options.addedFromState}`, hotkeys);

			for (let k of hotkeys)
				addHotkey(k, options.addedFromState, options.isGlobal);
		}


		if (isActive)
			register(true);

		scope.$on('$stateChangeSuccess', () => register());
		scope.$on('hotkeys-state-changed', () => register());
	};

	self.toggleHotkeys = (isEnabled) => {
		isActive = isEnabled;
		$rootScope.$broadcast('hotkeys-state-changed');
	};

	self.isActive = (multiKey) => isActive && (!multiKey || (multiHotkeyList[multiKey] && multiHotkeyList[multiKey].isActive));

	self.getMultiComboPrettified = (multiKey, name) => {
		let keys = multiHotkeyList[multiKey] ? multiHotkeyList[multiKey].list.filter(k => k.name == name) : null;
		return keys && keys.length > 0 ? keys[0].combo.join(',') : '';
	};

	self.clearHotkeys = (isRemoveAll = false) => {
		console.log('hotkeys.clearHotkeys()');

		let isPopupState = router.isPopupState($state.current.name);
		let isLegendState = isPopupState && $state.current.name.endsWith('.hotkeys');

		for (let key of Object.keys(hotkeyList)) {
			if (key !== '?') {
				let hotkey = hotkeys.get(key);
				let hotkeyOptions = hotkeyList[key];
				let isParent = $state.current.name.includes(hotkeyOptions.addedFromState);

				if (!hotkey || !hotkeyOptions)
					continue;

				if (isActive && !isRemoveAll && hotkeyOptions.isGlobal && (!isPopupState || hotkeyOptions.isPopup))
					continue;

				if (!isActive || isRemoveAll || !isParent || (isPopupState && !hotkeyOptions.isPopup)) {
					removeHotkey(hotkeyOptions);

					if (!isLegendState)
						delete hotkeyList[key];
				}
			}
		}
	};
};
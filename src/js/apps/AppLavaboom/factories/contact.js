module.exports = /*@ngInject*/(co, user, crypto, ContactEmail) => {
	var Contact = function(opt) {
		var self = this;

		angular.extend(this, opt);

		if (!this.name && this.email)
			this.name = this.email.split('@')[0].trim();

		this.hiddenEmail = this.hiddenEmail ? new ContactEmail(this, this.hiddenEmail, 'hidden') : null;
		this.privateEmails = this.privateEmails ? this.privateEmails.map(e => new ContactEmail(this, e, 'private')) : [];
		this.businessEmails = this.businessEmails ? this.businessEmails.map(e => new ContactEmail(this, e, 'business')) : [];

		this.isCustomName = () => self.firstName && self.lastName && self.name != `${self.firstName.trim()} ${self.lastName.trim()}`;

		this.getFullName = () => self.isCustomName() ? self.name + ` (${self.firstName.trim()} ${self.lastName.trim()})` : self.name;

		this.isMatchEmail = (email) =>
		(self.email == email) ||
		(self.privateEmails && self.privateEmails.includes(email)) ||
		(self.businessEmails && self.businessEmails.includes(email));

		this.getSortingField = (id) => {
			if (id === 1)
				return self.firstName;
			if (id === 2)
				return self.lastName;
			return self.name;
		};

		this.isPrivate = () => !!self.hiddenEmail;

		this.isSecured = () => {
			if (self.hiddenEmail && !self.hiddenEmail.isSecured())
				return false;

			if (self.privateEmails)
				if (self.privateEmails.some(e => !e.isSecured()))
					return false;

			if (self.businessEmails)
				if (self.businessEmails.some(e => !e.isSecured()))
					return false;

			return true;
		};

		this.getSecureClass = () => `sec-${self.isSecured() ? 1 : 0}`;
	};

	var secureFields = ['firstName', 'lastName', 'companyName', 'privateEmails', 'businessEmails', 'hiddenEmail'];

	Contact.toEnvelope = (contact) => co(function *() {
		let data = secureFields.reduce((a, field) => {
			a[field] = contact[field];
			return a;
		}, {});

		console.log('contact to envelope', data);

		var envelope = yield crypto.encodeEnvelopeWithKeys({
			data: data,
			encoding: 'json'
		}, [user.key.key], 'data');
		envelope.name = contact.name;

		return envelope;
	});

	Contact.fromEnvelope = (envelope) => co(function *() {
		var data = yield crypto.decodeEnvelope(envelope, 'data');

		switch (data.majorVersion) {
			default:
				let c = new Contact(angular.extend({}, {
					id: envelope.id,
					name: envelope.name,
					dateCreated: envelope.date_created,
					dateModified: envelope.date_modified
				}, data.data));

				console.log('contact', c);

				return c;
		}
	});

	return Contact;
};
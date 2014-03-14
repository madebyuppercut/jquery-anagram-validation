
describe("A form", function() {
	var $fixtures, $fixtureForm, valObj, testOptions;

	beforeEach(function() {
		loadFixtures('validation.html');
		$fixtureForm = $('#fixture-form');

		testOptions = {
			'patterns': {
				'custom-text': {'pattern': '^(abc)|(123)$', 'message': 'This is custom pattern match text'}
			}
		};
	});

	it("should be bound with Anagram Validation", function() {
		valObj = $fixtureForm.anagramValidation(testOptions).data('anagram-validation-object');
		expect(typeof valObj).toBe("object");
	});

	it("should validate and submit button should be inactive", function() {
		$fixtureForm.anagramValidation(testOptions).data('anagram-validation-object');
		$fixtureForm.submit();

		// Should have 14 offending fields total
		expect($('[data-valid="false"]', $fixtureForm).length).toBe(15);
		expect($('button[type="submit"]', $fixtureForm).hasClass('inactive')).toBe(true);
	});

	it("should handle server side error messages by public method and submit button should be inactive", function() {
		valObj = $fixtureForm.anagramValidation(testOptions).data('anagram-validation-object');
		valObj.loadErrors(mockErrors);

		// Should have 2 offending fields total with message
		expect($('[data-valid="false"]', $fixtureForm).length).toBe(17);
		expect($('.error-message', $fixtureForm).length).toBe(2);
		expect($('button[type="submit"]', $fixtureForm).hasClass('inactive')).toBe(true);
	});

	it("should handle server side error messages by loading errors in options and submit button should be inactive", function() {
		var optionsWithErrors = $.extend({}, testOptions, { 'errors': mockErrors });
		$fixtureForm.anagramValidation(optionsWithErrors);

		// Should have 2 offending fields total with message
		expect($('[data-valid="false"]', $fixtureForm).length).toBe(17);
		expect($('.error-message', $fixtureForm).length).toBe(2);
		expect($('button[type="submit"]', $fixtureForm).hasClass('inactive')).toBe(true);
	});

	it("should handle server side error messages by triggering errors.load and submit button should be inactive, errors.load.complete should be triggered", function() {
		function errorsLoadCompleteHandler(event) {
			$(event.target).addClass('triggered');
		}

		var optionsWithErrors = $.extend({}, testOptions, { 'errors': mockErrors });
		$fixtureForm.on('errors.load.complete', errorsLoadCompleteHandler);
		$fixtureForm.anagramValidation(optionsWithErrors);

		// Should have 2 offending fields total with message
		expect($('[data-valid="false"]', $fixtureForm).length).toBe(17);
		expect($('.error-message', $fixtureForm).length).toBe(2);
		expect($('button[type="submit"]', $fixtureForm).hasClass('inactive')).toBe(true);
		expect($fixtureForm.is('.triggered')).toBe(true);
	});

	it("should trigger validate.before event", function() {
		function validateBeforeHandler(event, $field) {
			$field.addClass('triggered');
		}
		$fixtureForm.on('validate.before', validateBeforeHandler);
		$fixtureForm.anagramValidation(testOptions);
		$fixtureForm.submit();

		// Should have 2 offending fields total
		expect($('.triggered', $fixtureForm).length).toBe(23);
	});

	it("should trigger validate.complete event", function() {
		function validateCompleteHandler(event, $field) {
			$field.addClass('triggered');
		}
		$fixtureForm.on('validate.complete', validateCompleteHandler);
		$fixtureForm.anagramValidation(testOptions);
		$fixtureForm.submit();

		// Should have 2 offending fields total
		expect($('.triggered', $fixtureForm).length).toBe(23);
	});

	it("should trigger validate.all.before event", function() {
		function validateBeforeAllHandler(event) {
			$(event.target).addClass('triggered');
		}
		$fixtureForm.on('validate.before.all', validateBeforeAllHandler);
		$fixtureForm.anagramValidation(testOptions);
		$fixtureForm.submit();

		// Should have 2 offending fields total
		expect($fixtureForm.is('.triggered')).toBe(true);
	});

	it("should trigger validate.all.complete event", function() {
		function validateCompleteAllHandler(event) {
			$(event.target).addClass('triggered');
		}
		$fixtureForm.on('validate.complete.all', validateCompleteAllHandler);
		$fixtureForm.anagramValidation(testOptions);
		$fixtureForm.submit();

		// Should have 2 offending fields total
		expect($fixtureForm.is('.triggered')).toBe(true);
	});
});
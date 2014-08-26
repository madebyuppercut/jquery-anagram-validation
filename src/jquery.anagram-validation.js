/**
 * Anagram Validation jQuery Plugin v0.5
 *
 * The purpose of this plugin is enable client-side validation (it's up to the application to determine its CSS) as weel as server-side error message rendering.
 * For usage, please refer to the Jasmine test suite and fixture.
 *
 * Copyright 2014 Anagram Inc.
 * Released under the MIT License
 *
 * Date: 2014-02-11T23:22:46Z
 */
(function($) {
	'use strict';
	$.fn.anagramValidation = function(options) {
		/************************************************************************************
		 * Plugin defaults and globals
		 ***********************************************************************************/

		var
			_formElementSelector = 'input, select, textarea',
			_patterns = {
				'email': {'pattern': '^(([a-zA-Z0-9_\\-\\.\\+]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5}){1,25})+$', 'message': 'Email is not valid'},
				'emailList': {'pattern': '^(([a-zA-Z0-9_\\-\\.\\+]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5}){1,25})+(([,.;]\\s*){1}(([a-zA-Z0-9_\\-\\.\\+]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5}){1,25})+)*$', 'message': 'Email list is not valid'},
				'text': {'pattern': '^[\\w\\W\\s\\d\\D]*$', 'message': 'Invalid text'},
				'phone': {'pattern': '^(\\d{3}|\\(\\d{3}\\))[-\\.\\s]?\\d{3}[-\\.\\s]?\\d{4}(\\s?(x|ext|ext\\.){1}\\s?\\d+)?$', 'message': 'Phone number is not valid'},
				'evenNumber': {'pattern': '^\\d*[02468]{1}$', 'message': 'Even number only'},
				'oddNumber': {'pattern': '^\\d*[13579]{1}$', 'message': 'Odd number only'}
			},
			DEFAULTS = {
				'error-field-class': 'has-error',
				'error-class': 'error-message',
				'patterns': _patterns,
				'required-message': '!name! is a required field',
				'minlength-message': '!name! is under !min! characters',
				'maxlength-message': '!name! exceeds !max! characters',
				'repeat-message': 'Your must confirm your !name!',
				'inactive-class': 'inactive'
			},
			REQUIRED = 'required',
			MATCH = 'match',
			MAXLENGTH = 'maxlength',
			MINLENGTH = 'minlength',
			REPEAT = 'repeat',
			PATTERNS = 'patterns',
			ERROR_CLASS = 'error-class',
			ERROR_FIELD_CLASS = 'error-field-class',
			INACTIVE_CLASS = 'inactive-class',

			VALIDATE_BEFORE_EVENT = 'validate.before',							// Triggered before a validation (with the field as parameter)
			VALIDATE_COMPLETE_EVENT = 'validate.complete',					// Triggered when a validation is complete (with the field as parameter)
			VALIDATE_ALL_BEFORE_EVENT = 'validate.all.before',			// Triggered before all validations starts
			VALIDATE_ALL_COMPLETE_EVENT = 'validate.all.complete',	// Triggered when all validations complete
			ERRORS_LOAD_COMPLETE_EVENT = 'errors.load.complete',	// Triggered when server-side errors are loaded

			VALIDATE_ALL_EVENT = 'validate.all',										// To trigger validation all fields
			VALIDATE_FIELD_EVENT = 'validate.field',								// To trigger validation individual fields
			ERRORS_LOAD_EVENT = 'errors.load';											// To trigger errors to load


		/************************************************************************************
		 * Class definition
		 ***********************************************************************************/

		/**
		 * Class validation object.
		 * @param {object} $context The jQuery DOM object.
		 * @param {object} options The options which would over-ride the default settings.
		 */
		function AnagramValidation($context, options) {

			/************************************************************************************
			 * Private methods
			 ***********************************************************************************/

			/**
			 * Replace all occurance of a map object with corresponding strings.
			 * @param {string} str The master string containing possible placeholder strings.
			 * @param {object} mapObj Mapping of searching strings as keys, with a replacement string as its value.
			 * @return {string} This returns the replaced string.
			 */
			function _replaceAll(str, mapObj) {
				var re = new RegExp(Object.keys(mapObj).join("|"),"gi");
				return str.replace(re, function(matched){
					return mapObj[matched.toLowerCase()];
				});
			}

			/**
			 * Validates an individual value against defined criteria.
			 * @param {string} value The value to be validated.
			 * @param {boolean} required Flag indicates if the field is required
			 * @param {string} match The matching pattern name as defined in options or default patterns
			 * @param {number} min The minimum length of a value
			 * @param {number} max The maximum length of a value
			 * @return {object} This returns an object of boolean values for each validity category.
			 */
			function _validate(value, required, match, min, max, repeat) {
				var
					matchPattern = _settings[PATTERNS][match] || _settings[PATTERNS]['text'],		// Fall back on plain text
					regex = new RegExp(matchPattern.pattern),
					validity = {};

				validity[REQUIRED] = true;
				validity[MATCH] = true;
				validity[MAXLENGTH] = true;
				validity[MINLENGTH] = true;
				validity[REPEAT] = true;

				// Only need to check if either it's a required field or a value is present
				if (required || value) {
					if (required && !value) { validity[REQUIRED] = false; }
					if (required && typeof value === 'number' && parseInt(value, 10) === 0) { validity[REQUIRED] = false; }
					if (value) {
						validity[MATCH] = regex.test(value);
					}
					if (min) { validity[MINLENGTH] = value.length >= min; }
					if (max) { validity[MAXLENGTH] = value.length <= max; }
					if (repeat) { validity[REPEAT] = value === $('[name*="' + repeat + '"]').val(); }
				}

				return validity;
			}

			/**
			 * Renders error messages
			 * @param {object} $field The field at which the error messages are rendered in.
			 * @param {Array.<string>} The error messages to be rendered.
			 */
			function _renderMessages($field, messages) {
				if (messages.length > 0) {
					var
						$errorsContainer = $('<small>').attr({'class': _settings[ERROR_CLASS], 'data-field': $field.attr('name')}),
						$errorsList = $('<ul>');

					for (var i = 0; i < messages.length; i++) {
						if (messages[i].length > 0) {
							$errorsList.append($('<li>').html(messages[i]));
						}
					}

					$errorsContainer.append($errorsList);
					$field.after($errorsContainer);
				}
			}

			/**
			 * Renders submit button(s) to inactive if there are errors present
			 */
			function _resolveSubmitActiveState(event) {
				var $submit = $('[type="submit"]:not([data-ignore-submit])', $(event.target).closest('form'));

				if ($('[data-valid="false"]', $context).length > 0 ) {
					$submit.addClass(_settings[INACTIVE_CLASS]);
				} else {
					$submit.removeClass(_settings[INACTIVE_CLASS]);
				}
			}

			/************************************************************************************
			 * Event handler methods
			 ***********************************************************************************/

			/**
			 * Event handler for validating a field
			 * @param {event} event The jQuery event object triggered.
			 */
			function _validateFieldHandler(event, flags) {
				var
					$field = $(event.target),
					val = null,
					match = null,
					messages = [],
					required = null,
					max = null,
					min = null,
					length = null,
					repeat = null,
					validity = null;
					
				flags = flags || {'silence': false};
				$context.trigger(VALIDATE_BEFORE_EVENT, [$field]);

				switch ($field[0].nodeName.toLowerCase()) {
					case 'input':
						switch ($field.attr('type').toLowerCase()) {
							case 'radio':
							case 'checkbox':
								val = $field.closest('form').find('input[name="' + $field.attr('name') + '"]:checked').val();
								break;
							default:
								val = $field.val();
								// For anything else, treat as text
								break;
						}
						break;
					case 'select':
						val = $field.val();
						break;
					case 'textarea':
						val = $field.val();
						break;
					default:
						// Reserved
						break;
				}

				if ($field.is('[data-numeric]')) { val = parseInt(val, 10); }

				match = $field.data('match') || $field.attr('type');
				required = $field.is('[required]');
				max = $field.data('maxlength') || $field.attr('maxlength');
				min = $field.data('minlength') || $field.attr('maxlength');
				repeat = $field.data('repeat');

				validity = _validate(val, required, match, parseInt(min, 10), parseInt(max, 10), repeat);

				for (var key in validity) {
					if (!validity[key]) {
						var
							messageKey = key + '-message',
							tempMessage = "";

						// Only match requires extra lookup for pattern specific error messages
						if (key === MATCH) {
							var matchPattern = _settings[PATTERNS][match] || _settings[PATTERNS]['text'];		// Fall back on plain text
							tempMessage = $field.data(messageKey) || matchPattern.message;
						} else {
							tempMessage = $field.data(messageKey) || _settings[messageKey];
						}

						tempMessage = _replaceAll(tempMessage, {
							'!name!': $field.attr('name'),
							'!min!': min,
							'!max!': max
						});
						messages.push(tempMessage);
					}
				}

				$('[data-field="' + $field.attr('name') + '"]').detach();
				if (messages.length > 0) {
					if (!(flags.silence)) {
						$field.addClass(_settings[ERROR_FIELD_CLASS]);
						if (!$field.is('[data-silent]')) { _renderMessages($field, messages); }
					}
					$field.attr('data-valid', 'false');
				} else {
					$field.removeClass(_settings[ERROR_FIELD_CLASS]).attr('data-valid', 'true');
				}
				_resolveSubmitActiveState(event);

				$context.trigger(VALIDATE_COMPLETE_EVENT, [$field, validity]);
			}

			/**
			 * Event handler for validation complete. This sets a form submit as active/inactive
			 * @param {event} event The jQuery event object.
			 */
			function _validateAllHandler(event, flags) {
				$context.trigger(VALIDATE_ALL_BEFORE_EVENT);

				$(_formElementSelector, $context).each(function() {
					$(this).trigger(VALIDATE_FIELD_EVENT, [flags]);
				});

				_resolveSubmitActiveState(event);
				$context.trigger(VALIDATE_ALL_COMPLETE_EVENT);
			}

			/**
			 * Event handler for form submission.
			 * @param {event} event The jQuery event object.
			 */
			function _submitHandler(event) {
				var $submit = $('[type="submit"]:not([data-ignore-submit])', event.target);

				if ($submit.hasClass(_settings[INACTIVE_CLASS])) {
					event.preventDefault();
					return false;
				} else {
					$context.trigger(VALIDATE_ALL_EVENT);

					if ($('[data-valid="false"]', event.target).length === 0) {
						return true;
					} else {
						event.preventDefault();
						return false;
					}
				}
			}

			/**
			 * Event handler for receiving server-side error messages.
			 * @param {event} event The jQuery event object.
			 * @param {object} errors The errors object containing server-side error messages.
			 */
			function _loadErrorsHandler(event, errors) {
				for (var key in errors) {
					var $field = $('[name*="' + key + '"]', event.target);

					if ($field.length > 0) {
						_renderMessages($field, errors[key]);
						$field.addClass(_settings[ERROR_FIELD_CLASS]).attr({'data-valid': 'false'});
					}
				}

				_resolveSubmitActiveState(event);
				$context.trigger(ERRORS_LOAD_COMPLETE_EVENT);
			}

			/************************************************************************************
			 * Public methods
			 ***********************************************************************************/

			/**
			 * Method to load server side error messages
			 * @param {object} errors JavaScript object that holds the error messages.
			 */
			this.loadErrors = function(errors) {
				$context.trigger(ERRORS_LOAD_EVENT, [errors]);
			};

			/**
			 * Method to load server side error messages
			 * @param {object} errors JavaScript object that holds the error messages.
			 */
			this.validateAll = function(errors) {
				$context.trigger(VALIDATE_ALL_EVENT);
			};

			/***********************************************************************************/

			var _settings = $.extend(true, DEFAULTS, options);

			$context.on('submit', _submitHandler);
			$context.on(ERRORS_LOAD_EVENT, _loadErrorsHandler);

			// Delegate validate events on form selectors. This allows individual field validation
			$context.on('change keyup input blur', _formElementSelector, _validateFieldHandler);
			$context.on(VALIDATE_FIELD_EVENT, _formElementSelector, _validateFieldHandler);

			// Changing one field would trigger entire form validation for active/inactive toggle
			$context.on('change', _validateAllHandler);
			$context.on(VALIDATE_ALL_EVENT, _validateAllHandler);

			// Prep the initial validity of all fields, but not showing messages.
			$context.trigger(VALIDATE_ALL_EVENT, [{'silence': true}]);

			if (typeof _settings.errors !== "undefined") {
				$context.trigger(ERRORS_LOAD_EVENT, [_settings.errors]);
			}

			return this;
		}

		// Ensuring if context is a collection of forms, each one is initialized with its own AnagramValidation instance.
		// Returning the jQuery context for further chaining.
		return this.each(function() {
			if (!$(this).data('anagram-validation-object')) {
				$(this).data('anagram-validation-object', new AnagramValidation($(this), options));
			}
		});
	};
}(jQuery));
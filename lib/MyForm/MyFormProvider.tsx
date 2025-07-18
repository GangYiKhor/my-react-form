import { useCallback, useMemo, useRef, useState } from 'react';
import './MyForm.scss';
import type { DataType, FieldType, FormFieldType, FormPropertiesType, PropertiesType } from './MyFormContext';
import { Form } from './MyFormContext';
import { FormTheme } from './MyFormTheme';

function dataToFormData(data: DataType): FieldType {
	return Object.fromEntries(Object.entries(data ?? {}).map(([key, value]) => [key, { value, valid: true }]));
}
function formDataToData(data: FieldType): DataType {
	return Object.fromEntries(Object.entries(data ?? {}).map(([key, value]) => [key, value.value]));
}
function formDataValidity(data: FieldType): { [key: string]: boolean } {
	return Object.fromEntries(Object.entries(data ?? {}).map(([key, value]) => [key, value.valid]));
}

type PropType = {
	/**
	 * If `'browser'`, `prefers-color-scheme: dark` is used
	 *
	 * If `'class'`, apply dark theme when it is under any element with className `'dark'`
	 */
	darkMode?: 'browser' | 'class' | 'disabled';
	children: React.ReactNode;
};

/**
 * Global context provider for `MyForm` implementations, wrap your application with this provider to enable all form handlers
 *
 * A `darkMode` settings is provided to define the how form inputs capture the dark mode
 * - `'browser'`: The form will capture dark mode using browser prefer theme
 * - `'class'`: If the form is wrapped with any element with class name `'dark'` dark theme will be applied
 * - `(default) 'disabled'`: The form will always use light theme
 */
export default function MyFormProvider({ darkMode = 'disabled', children }: PropType) {
	const [formData, setFormData] = useState<FormFieldType>({});
	const formProperties = useRef<FormPropertiesType>({});
	const subForms = useRef<{ [key: string]: string[] }>({});

	const initialiseForm = useCallback(({ formId, data }: { formId: string; data: Partial<DataType> }) => {
		if (!formId) {
			console.error('Form ID is not provided! Unable to update form data!');
		} else {
			setFormData((state) => ({ ...state, [formId]: dataToFormData(data) }));
		}
	}, []);

	const updateField = useCallback(
		({
			formId,
			name,
			value,
			valid,
			skipRender,
		}: {
			formId: string;
			name: string;
			value?: any;
			valid?: boolean;
			skipRender?: boolean;
		}) => {
			if (!formId) {
				console.error('Form ID is not provided! Unable to update form data!');
			} else if (!name) {
				console.error('Form update name is not provided! Unable to update form data!');
			} else {
				setFormData((state) => {
					if (skipRender && state[formId]?.[name]) {
						if (value !== undefined) state[formId][name].value = value;
						if (valid !== undefined) state[formId][name].valid = valid;
					} else {
						const newValue: { value?: any; valid?: boolean } = {};
						if (value === null) newValue.value = undefined;
						else if (value !== undefined) newValue.value = value;
						if (valid !== undefined) newValue.valid = !!valid;

						if (!skipRender) state = { ...state };
						if (!state[formId]) state[formId] = {};
						state[formId][name] = { ...(state[formId][name] ?? {}), ...newValue };
					}
					return state;
				});
			}
		},
		[]
	);

	const deleteField = useCallback(({ formId, name }: { formId: string; name: string }) => {
		if (!formId) {
			console.error('Form ID is not provided! Unable to update form data!');
		} else if (!name) {
			console.error('Form update name is not provided! Unable to update form data!');
		} else {
			setFormData((state) => {
				state = { ...state };
				if (state[formId]?.[name]) delete state[formId][name];
				return state;
			});
			if (formProperties.current[formId]?.[name]) delete formProperties.current[formId]?.[name];
		}
	}, []);

	const validateField = useCallback(
		(formId: string, name: string, valid: boolean = true) => {
			if (!formId) {
				console.error('Form ID is not provided! Unable to update form data!');
			} else if (!name) {
				console.error('Form update name is not provided! Unable to update form data!');
			} else {
				updateField({ formId, name, valid });
			}
		},
		[updateField]
	);

	const resetForm = useCallback((formId: string) => {
		setFormData((state) => {
			state = { ...state };
			state[formId] = {};
			for (const [name, { defaultValue }] of Object.entries(formProperties.current?.[formId] ?? {})) {
				state[formId][name] = { value: defaultValue, valid: true };
			}
			return state;
		});
	}, []);

	const clearForm = useCallback((formId: string) => {
		if (!formId) {
			console.error('Form ID is not provided! Unable to update form data!');
		} else {
			setFormData((state) => {
				if (state[formId] === undefined) return state;
				return { ...state, [formId]: {} };
			});
		}
	}, []);

	const emptyForm = useCallback((formId: string, emptyForm?: DataType) => {
		if (!formId) {
			console.error('Form ID is not provided! Unable to update form data!');
		} else {
			setFormData((state) => {
				state = { ...state };
				const dictList = Object.entries(state[formId] ?? {});
				const emptyDictList = dictList.map(([key, _]) => [key, { value: undefined, valid: true }]);
				const emptyDict = Object.fromEntries(emptyDictList);
				if (emptyForm === undefined) {
					state[formId] = emptyDict;
				} else {
					for (const key in emptyForm) emptyDict[key] = emptyForm[key];
					state[formId] = dataToFormData(emptyForm);
				}
				return state;
			});
		}
	}, []);

	const deleteForm = useCallback((formId: string) => {
		if (!formId) {
			console.error('Form ID is not provided! Unable to update form data!');
		} else {
			setFormData((state) => {
				if (state[formId] === undefined) return state;
				state = { ...state };
				delete state[formId];
				return state;
			});
		}
	}, []);

	const getFormData = useCallback(
		(formId?: string) => {
			if (formId) {
				if (!formData[formId]) return {};

				let forms = Object.entries(formData[formId]);
				const formObjs: DataType & { [key: string]: DataType } = {};
				subForms.current[formId]?.forEach((subFormId) => {
					const fields = forms.filter(([key, _]) => key.startsWith(`${subFormId}__`));
					forms = forms.filter(([key, _]) => !key.startsWith(`${subFormId}__`));
					const cleanedFields = fields.map(([key, value]) => [key.replace(`${subFormId}__`, ''), value]);
					const data = Object.fromEntries(cleanedFields) as FieldType;
					formObjs[subFormId] = formDataToData(data);
				});

				const data = formDataToData(Object.fromEntries(forms) as FieldType);
				for (const key in data) formObjs[key] = data[key];
				return formObjs;
			} else {
				const allForms: { [formId: string]: DataType & { [key: string]: DataType } } = {};
				for (const formId in formData) {
					let forms = Object.entries(formData[formId]);
					const formObjs: DataType & { [key: string]: DataType } = {};
					subForms.current[formId]?.forEach((subFormId) => {
						const fields = forms.filter(([key, _]) => key.startsWith(`${subFormId}__`));
						forms = forms.filter(([key, _]) => !key.startsWith(`${subFormId}__`));
						const cleanedFields = fields.map(([key, value]) => [key.replace(`${subFormId}__`, ''), value]);
						const data = Object.fromEntries(cleanedFields) as FieldType;
						formObjs[formId] = formDataToData(data);
					});

					const data = formDataToData(Object.fromEntries(forms) as FieldType);
					for (const key in data) formObjs[key] = data[key];
					allForms[formId] = formObjs;
				}
				return allForms;
			}
		},
		[formData]
	) as (() => DataType) & ((formId: string) => { [key: string]: DataType });

	const getFormValid = useCallback(
		(formId?: string) => {
			if (formId) {
				if (!formData[formId]) return {};

				let forms = Object.entries(formData[formId]);
				const formObjs: DataType & { [key: string]: DataType } = {};
				subForms.current[formId]?.forEach((subFormId) => {
					const fields = forms.filter(([key, _]) => key.startsWith(`${subFormId}__`));
					forms = forms.filter(([key, _]) => !key.startsWith(`${subFormId}__`));
					const cleanedFields = fields.map(([key, value]) => [key.replace(`${subFormId}__`, ''), value]);
					const data = Object.fromEntries(cleanedFields) as FieldType;
					formObjs[subFormId] = formDataValidity(data);
				});

				const data = formDataValidity(Object.fromEntries(forms) as FieldType);
				for (const key in data) formObjs[key] = data[key];
				return formObjs;
			} else {
				const allForms: { [formId: string]: DataType & { [key: string]: DataType } } = {};
				for (const formId in formData) {
					let forms = Object.entries(formData[formId]);
					const formObjs: DataType & { [key: string]: DataType } = {};
					subForms.current[formId]?.forEach((subFormId) => {
						const fields = forms.filter(([key, _]) => key.startsWith(`${subFormId}__`));
						forms = forms.filter(([key, _]) => !key.startsWith(`${subFormId}__`));
						const cleanedFields = fields.map(([key, value]) => [key.replace(`${subFormId}__`, ''), value]);
						const data = Object.fromEntries(cleanedFields) as FieldType;
						formObjs[formId] = formDataValidity(data);
					});

					const data = formDataValidity(Object.fromEntries(forms) as FieldType);
					for (const key in data) formObjs[key] = data[key];
					allForms[formId] = formObjs;
				}
				return allForms;
			}
		},
		[formData]
	) as (() => { [k: string]: { [key: string]: boolean } }) & ((formId?: string) => { [key: string]: boolean });

	const setInvalidReason = useCallback((formId: string, name: string, reason: string) => {
		if (!formId) {
			console.error('Form ID is not provided! Unable to set form data invalid reason!');
		} else if (!name) {
			console.error('Form update name is not provided! Unable to update form data!');
		} else {
			setFormData((state) => {
				state = { ...state };
				if (!state[formId]) state[formId] = {};
				state[formId][name] = { ...state[formId][name], invalidReason: reason };
				return state;
			});
		}
	}, []);

	const validateForm = useCallback(
		(formId: string) => {
			if (!formId) {
				console.error('Form ID is not provided! Unable to validate form data!');
				return false;
			} else {
				const fieldData = formData[formId];
				const fieldProperties = formProperties.current[formId];
				if (!fieldData || Object.keys(fieldData).length === 0) {
					console.warn('Form is empty!');
					return false;
				}
				if (!fieldProperties || Object.keys(fieldProperties).length === 0) return true;

				let valid = true;
				for (const field in fieldProperties) {
					const properties = fieldProperties[field];
					const data = fieldData[field]?.value;

					if (properties.required) {
						if (typeof properties.required === 'boolean' && data == undefined) {
							validateField(formId, field, false);
							valid = false;
							continue;
						} else if (properties.required instanceof Function && !properties.required(data)) {
							validateField(formId, field, false);
							valid = false;
							continue;
						}
					}
					if (data !== undefined && properties.validator) {
						const result = properties.validator(data);
						if (result === false) {
							validateField(formId, field, false);
							valid = false;
							continue;
						} else if (typeof result === 'string') {
							validateField(formId, field, false);
							setInvalidReason(formId, field, result);
							valid = false;
							continue;
						}
					}
					validateField(formId, field, true);
				}

				return valid;
			}
		},
		[formData, setInvalidReason, validateField]
	);

	const setFieldProperties = useCallback(
		({
			formId,
			name,
			defaultValue,
			required,
			validator,
		}: {
			formId: string;
			name: string;
			defaultValue?: any;
			required?: boolean | ((value: any) => boolean);
			validator?: (input: any) => boolean | string;
		}) => {
			if (!formId) {
				console.error('Form ID is not provided! Unable to update form properties!');
			} else if (!name) {
				console.error('Form update name is not provided! Unable to update form properties!');
			} else {
				const newValue: Partial<PropertiesType['']> = {};
				if (defaultValue !== undefined) newValue.defaultValue = defaultValue;
				if (required !== undefined) newValue.required = required;
				if (validator) newValue.validator = validator;

				if (!formProperties.current[formId]) formProperties.current[formId] = {};
				formProperties.current[formId][name] = { ...(formProperties.current[formId][name] ?? {}), ...newValue };

				setFormData((state) => {
					if (!state[formId] || state[formId]?.[name]) return state;
					state = { ...state };
					state[formId][name] = { value: undefined, valid: true };
					return state;
				});
			}
		},
		[]
	);

	const setSubForm = useCallback((formId: string, prefix: string) => {
		if (formId in subForms.current) subForms.current[formId].push(prefix);
		else subForms.current[formId] = [prefix];
	}, []);

	const deleteSubForm = useCallback((formId: string, prefix: string) => {
		if (formId in subForms.current) {
			subForms.current[formId] = subForms.current[formId].filter((p) => p !== prefix);
		}
	}, []);

	const form = useCallback(
		(formId: string) => {
			const _formData = formData[formId];
			const _formProperties = formProperties.current[formId];
			const _subForms = subForms.current[formId];

			function _initialiseForm(data: Partial<DataType>) {
				initialiseForm({ formId, data });
			}

			function _updateField({
				name,
				value,
				valid,
				skipRender,
			}: {
				name: string;
				value?: any;
				valid?: boolean;
				skipRender?: boolean;
			}) {
				updateField({ formId, name: name as string, value, valid, skipRender });
			}

			function _deleteField({ name }: { name: string }) {
				deleteField({ formId, name: name as string });
			}

			function _validateField(name: string, valid?: boolean) {
				validateField(formId, name, valid);
			}

			function _resetForm() {
				resetForm(formId);
			}

			function _clearForm() {
				clearForm(formId);
			}

			function _emptyForm(data?: DataType) {
				emptyForm(formId, data);
			}

			function _deleteForm() {
				deleteForm(formId);
			}

			function _getFormData() {
				return getFormData(formId);
			}

			function _getFormValid() {
				return getFormValid(formId) as { [key: string]: boolean };
			}

			function _validateForm() {
				return validateForm(formId);
			}

			function _setFieldProperties({
				name,
				defaultValue,
				required,
				validator,
			}: {
				name: string;
				defaultValue?: any;
				required?: boolean | ((value: any) => boolean);
				validator?: (input: any) => boolean | string;
			}) {
				return setFieldProperties({ formId, name: name as string, defaultValue, required, validator });
			}

			return {
				formData: _formData,
				formProperties: _formProperties,
				subForms: _subForms,
				initialiseForm: _initialiseForm,
				updateField: _updateField,
				deleteField: _deleteField,
				validateField: _validateField,
				resetForm: _resetForm,
				clearForm: _clearForm,
				emptyForm: _emptyForm,
				deleteForm: _deleteForm,
				getFormData: _getFormData,
				getFormValid: _getFormValid,
				validateForm: _validateForm,
				setFieldProperties: _setFieldProperties,
			};
		},
		[
			clearForm,
			deleteField,
			deleteForm,
			emptyForm,
			formData,
			getFormData,
			getFormValid,
			initialiseForm,
			resetForm,
			setFieldProperties,
			updateField,
			validateField,
			validateForm,
		]
	);

	const value = useMemo(
		() => ({
			formData,
			formProperties,
			subForms,
			initialiseForm,
			updateField,
			deleteField,
			validateField,
			resetForm,
			clearForm,
			emptyForm,
			deleteForm,
			getFormData,
			getFormValid,
			validateForm,
			setFieldProperties,
			setSubForm,
			deleteSubForm,
			form,
		}),
		[
			formData,
			initialiseForm,
			updateField,
			deleteField,
			validateField,
			resetForm,
			clearForm,
			emptyForm,
			deleteForm,
			getFormData,
			getFormValid,
			validateForm,
			setFieldProperties,
			setSubForm,
			deleteSubForm,
			form,
		]
	);

	return (
		<Form.Provider value={value}>
			<FormTheme.Provider value={darkMode}>{children}</FormTheme.Provider>
		</Form.Provider>
	);
}

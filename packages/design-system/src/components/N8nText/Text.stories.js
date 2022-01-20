import N8nText from './Text.vue';

export default {
	title: 'Atoms/Text',
	component: N8nText,
	argTypes: {
		size: {
			control: {
				type: 'select',
				options: ['mini', 'small', 'medium', 'large'],
			},
		},
		color: {
			control: {
				type: 'select',
				options: ['primary', 'text-dark', 'text-base', 'text-light', 'text-xlight'],
			},
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nText,
	},
	template: '<n8n-text v-bind="$props">hello world</n8n-text>',
});

export const Text = Template.bind({});

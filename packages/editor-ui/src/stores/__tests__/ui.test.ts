import { createPinia, setActivePinia } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { merge } from 'lodash-es';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';

let uiStore: ReturnType<typeof useUIStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let rootStore: ReturnType<typeof useRootStore>;
let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;

describe('UI store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		uiStore = useUIStore();
		settingsStore = useSettingsStore();
		rootStore = useRootStore();
		cloudPlanStore = useCloudPlanStore();
	});

	test.each([
		['default', 'production', 'https://n8n.io/pricing/?ref=test_source'],
		['default', 'development', 'https://n8n.io/pricing/?ref=test_source'],
		[
			'desktop_win',
			'production',
			'https://n8n.io/pricing/?utm_source=n8n-internal&utm_medium=desktop&utm_campaign=utm-test-campaign',
		],
		['cloud', 'production', 'https://app.n8n.cloud/account/change-plan'],
	])(
		'"upgradeLinkUrl" should generate the correct URL for "%s" deployment and "%s" license environment',
		(type, environment, expectation) => {
			settingsStore.setSettings(
				merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
					deployment: {
						type,
					},
					license: {
						environment,
					},
					instanceId: '123abc',
					versionCli: '0.223.0',
				}),
			);

			expect(uiStore.upgradeLinkUrl('test_source', 'utm-test-campaign')).toBe(expectation);
		},
	);

	it('should render non-production license banner based on enterprise settings', () => {
		settingsStore.setSettings(
			merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
				enterprise: {
					showNonProdBanner: true,
				},
			}),
		);
		expect(uiStore.bannerStack).toStrictEqual(['NON_PRODUCTION_LICENSE']);
	});
});

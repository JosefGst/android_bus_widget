import { Platform } from 'react-native';
if (Platform.OS === 'android' && !Platform.isTV) {
	// Only register widget handler on Android native
	const { registerWidgetTaskHandler } = require('react-native-android-widget');
	const { widgetTaskHandler } = require('./widget/widget-task-handler');
	registerWidgetTaskHandler(widgetTaskHandler);

	// Refresh the home-screen widget as soon as the user adds or removes a Favorite.
	const { onFavoritesChanged } = require('./utils/favorites');
	const { refreshBusWidget } = require('./widget/refresh_widget');
	onFavoritesChanged(() => {
		refreshBusWidget();
	});

	// Redraw it in the new language as soon as the user switches.
	const { onLanguageChanged } = require('./utils/language');
	onLanguageChanged(() => {
		refreshBusWidget();
	});
}

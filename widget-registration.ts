import { Platform } from 'react-native';
if (Platform.OS === 'android' && !Platform.isTV) {
	// Only register widget handler on Android native
	const { registerWidgetTaskHandler } = require('react-native-android-widget');
	const { widgetTaskHandler } = require('./widget/widget-task-handler');
	registerWidgetTaskHandler(widgetTaskHandler);
}

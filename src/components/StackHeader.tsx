import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { HeaderBack } from './ui';

/**
 * The bar above detail pages (an exercise, a workout, targets). The main header with your profile and the day
 * already sits above it, so this one is slim: a Back button lined up with the page content, an optional title
 * in the middle, and whatever the page puts on the right, like Edit. The one stack with no AppHeader above it
 * (User, see stackOptionsNoAppHeader below) passes safeArea so the bar pads itself clear of the status bar
 * instead of sitting under it.
 */
export function StackHeader({ options, safeArea }: any) {
  const insets = useSafeAreaInsets();
  const title = typeof options?.title === 'string' ? options.title : '';
  const right = typeof options?.headerRight === 'function' ? options.headerRight({ tintColor: C.text, canGoBack: true }) : null;
  return (
    <View style={[s.wrap, safeArea && { paddingTop: insets.top }]}>
      <View style={s.bar}>
        <View style={[s.side, { alignItems: 'flex-start' }]}>
          <View style={{ marginLeft: -6 }}><HeaderBack /></View>
        </View>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <View style={[s.side, { alignItems: 'flex-end' }]}>{right}</View>
      </View>
    </View>
  );
}

/** Options for every stack that holds detail pages, used under the main AppHeader, which already covers the
 *  safe area, so this bar never adds its own. */
export const stackOptions = {
  header: (props: any) => <StackHeader {...props} />,
  contentStyle: { backgroundColor: C.bg },
};

/** Same bar, for the one stack that turns its own AppHeader off entirely (User: its first page, reached from
 *  the profile icon, draws the safe area itself with Screen's top prop), so every other page in that stack
 *  needs to pad clear of the status bar on its own instead. */
export const stackOptionsNoAppHeader = {
  header: (props: any) => <StackHeader {...props} safeArea />,
  contentStyle: { backgroundColor: C.bg },
};

const s = StyleSheet.create({
  wrap: { backgroundColor: C.bg },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 44, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20 },
  side: { width: 96, justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: C.text, fontFamily: F.displayMed, fontSize: 16 },
});

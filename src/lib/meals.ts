import type Ionicons from '@expo/vector-icons/Ionicons';
import { A } from './theme';
import type { Meal } from './nutrition';

/** An icon and a colour for each meal, so breakfast, lunch, dinner and snacks are easy to tell apart. */
export const MEAL_STYLE: Record<Meal, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  breakfast: { icon: 'sunny', color: A.carbs },
  lunch: { icon: 'restaurant', color: A.up },
  dinner: { icon: 'moon', color: '#8f9bff' },
  snack: { icon: 'cafe', color: A.core },
};

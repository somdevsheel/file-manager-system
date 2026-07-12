import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  ...args: RootStackParamList[RouteName] extends undefined
    ? [screen: RouteName]
    : [screen: RouteName, params: RootStackParamList[RouteName]]
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error — generic spread is not narrowed by TS here, but the overload above keeps call sites type-safe
    navigationRef.navigate(...args);
  }
}

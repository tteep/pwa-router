import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(dashboard)">
        <Icon sf="house.fill" />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(rules)">
        <Icon sf="list.bullet.rectangle.fill" />
        <Label>Rules</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(apps)">
        <Icon sf="square.grid.2x2.fill" />
        <Label>Destinations</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Icon sf="gearshape.fill" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

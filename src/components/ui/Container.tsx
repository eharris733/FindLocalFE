import React from 'react';
import { View, ViewProps, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ContainerProps extends Omit<ViewProps, 'style'> {
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  safeArea?: boolean;
  scrollable?: boolean;
  style?: ViewProps['style'];
}

export const Container: React.FC<ContainerProps> = ({
  children,
  padding = 'md',
  safeArea = true,
  scrollable = false,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const containerStyles = {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing[padding],
  };

  const Content = scrollable ? ScrollView : View;
  const Wrapper = safeArea ? SafeAreaView : View;

  return (
    <Wrapper style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <Content style={[containerStyles, style]} {...props}>
        {children}
      </Content>
    </Wrapper>
  );
};

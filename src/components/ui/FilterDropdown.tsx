import React from "react";
import {useTheme} from "../../context/ThemeContext";
import {StyleSheet, TouchableOpacity, View} from "react-native";
import {Text} from "./Text";

interface FilterDropdownProps {
    label: string;
    selectedValue: string;
    options: string[];
    onValueChange: (value: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    icon?: string;
    disabled?: boolean;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
                                                           label,
                                                           selectedValue,
                                                           options,
                                                           onValueChange,
                                                           isOpen,
                                                           onToggle,
                                                           icon,
                                                           disabled = false,
                                                       }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.dropdownContainer}>
            <TouchableOpacity
                style={[
                    styles.dropdownButton,
                    {
                        backgroundColor: theme.colors.background.secondary,
                        borderColor: theme.colors.border.light,
                        opacity: disabled ? 0.6 : 1,
                    }
                ]}
                onPress={disabled ? undefined : onToggle}
                disabled={disabled}
            >
                <View style={styles.buttonContent}>
                    {icon && (
                        <Text variant="body2" style={styles.icon}>
                            {icon}
                        </Text>
                    )}
                    <Text variant="body2" color="primary" style={styles.dropdownText} numberOfLines={1}>
                        {selectedValue}
                    </Text>
                </View>
                <Text variant="body2" color="secondary" style={styles.arrow}>
                    {disabled ? '' : (isOpen ? '▲' : '▼')}
                </Text>
            </TouchableOpacity>

            {isOpen && !disabled && (
                <View style={[
                    styles.dropdown,
                    {
                        backgroundColor: theme.colors.background.secondary,
                        borderColor: theme.colors.border.light,
                        ...theme.shadows.medium,
                    }
                ]}>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.option,
                                {
                                    backgroundColor: option === selectedValue
                                        ? theme.colors.primary[50]
                                        : 'transparent',
                                }
                            ]}
                            onPress={() => {
                                onValueChange(option);
                                onToggle(); // Close the dropdown
                            }}
                        >
                            <Text
                                variant="body2"
                                color={option === selectedValue ? 'primary' : 'secondary'}
                                style={{ fontWeight: option === selectedValue ? '600' : '400' }}
                            >
                                {option}
                            </Text>
                            {option === selectedValue && (
                                <Text variant="body2" color="primary">✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    dropdownContainer: {
        position: 'relative',
        minWidth: 90,
        flex: 1,
        maxWidth: 120,
        zIndex: 1001,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 6,
        minWidth: 90,
    },
    dropdownText: {
        marginRight: 2,
        fontSize: 11,
        flex: 1,
        minWidth: 50,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        marginRight: 6,
        fontSize: 14,
    },
    arrow: {
        fontSize: 10,
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        borderWidth: 1,
        borderRadius: 6,
        maxHeight: 200,
        zIndex: 1002,
        elevation: 8,
        marginTop: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
});
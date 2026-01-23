export const colors = {
    light: {
        background: '#F9FAFB', // Light grey/white
        card: '#FFFFFF',
        text: '#1F2937', // Dark grey
        textSecondary: '#6B7280',
        border: '#E5E7EB',
        primary: '#E53935', // Chef Red
        accent: '#E53935',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#E53935',
        inputBackground: '#FFFFFF',
        tabBar: '#FFFFFF',
        tabIconDefault: '#9CA3AF',
        tabIconSelected: '#E53935',
        shadow: '#000000',
    },
    dark: {
        background: '#0B0B0F', // Main Dark Background (Existing)
        card: '#16161E', // Card background (Existing)
        text: '#FFFFFF',
        textSecondary: '#AAAAAA',
        border: '#27272A',
        primary: '#E53935',
        accent: '#E53935',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#D32F2F', // Slightly darker red for error text on dark
        inputBackground: '#16161E', // Match card
        tabBar: '#0B0B0F',
        tabIconDefault: '#AAAAAA',
        tabIconSelected: '#E53935',
        shadow: '#000000',
    }
};

export type ThemeColors = typeof colors.light;

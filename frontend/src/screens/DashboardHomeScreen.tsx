import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { usePayment } from '../context/PaymentContext';
import { useTheme } from '../context/ThemeContext';

type FilterType = 'all' | 'budget' | 'moderate' | 'premium';
type RatingFilter = 'all' | '3+' | '4+';
type TimeFilter = 'all' | '<15' | '15-30' | '30+';

// Mock recipe data - stable outside component
const othersRecipes = [
    { id: '1', name: 'Spicy Thai Curry', rating: 4.8, time: 25, price: '$$', emoji: '🍛', color1: '#FF6B6B', color2: '#FF8E53' },
    { id: '2', name: 'Italian Risotto', rating: 4.9, time: 30, price: '$$$', emoji: '🍚', color1: '#4ECDC4', color2: '#44A08D' },
    { id: '3', name: 'Beef Tacos', rating: 4.6, time: 20, price: '$', emoji: '🌮', color1: '#F7971E', color2: '#FFD200' },
    { id: '4', name: 'Salmon Teriyaki', rating: 4.7, time: 22, price: '$$', emoji: '🍱', color1: '#667EEA', color2: '#764BA2' },
];

const recommendedRecipes = [
    { id: '5', name: 'Chicken Alfredo', rating: 4.9, time: 28, price: '$$', emoji: '🍝', color1: '#F093FB', color2: '#F5576C' },
    { id: '6', name: 'Veggie Stir Fry', rating: 4.5, time: 15, price: '$', emoji: '🥗', color1: '#4FACFE', color2: '#00F2FE' },
    { id: '7', name: 'BBQ Ribs', rating: 4.8, time: 45, price: '$$$', emoji: '🍖', color1: '#FA709A', color2: '#FEE140' },
    { id: '8', name: 'Mushroom Soup', rating: 4.4, time: 18, price: '$', emoji: '🍲', color1: '#30CFD0', color2: '#330867' },
];

const trendingRecipes = [
    { id: '9', name: 'Pad Thai', rating: 4.9, time: 23, price: '$$', emoji: '🍜', color1: '#FF9A56', color2: '#FF6A88' },
    { id: '10', name: 'Greek Salad', rating: 4.6, time: 10, price: '$', emoji: '🥙', color1: '#A8EDEA', color2: '#FED6E3' },
    { id: '11', name: 'Lamb Chops', rating: 4.7, time: 35, price: '$$$', emoji: '🥩', color1: '#FF6B95', color2: '#FFC796' },
    { id: '12', name: 'Sushi Bowl', rating: 4.8, time: 20, price: '$$', emoji: '🍣', color1: '#89F7FE', color2: '#66A6FF' },
];

export default function DashboardHomeScreen() {
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<'cooking' | 'discover'>('cooking');
    const [isCooking, setIsCooking] = useState(false);
    const [stoveStatus, setStoveStatus] = useState<'running' | 'stopped' | 'paused'>('running');
    const [showSteps, setShowSteps] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'stop' | 'pause' | null>(null);
    const [stepTimer, setStepTimer] = useState(0); // Timer for current step in seconds
    const [pauseTimer, setPauseTimer] = useState(0); // Timer for pause duration in seconds
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    // Filter states
    const [priceFilter, setPriceFilter] = useState<FilterType>('all');
    const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [discoverSearch, setDiscoverSearch] = useState('');

    // Purchase Flow States
    const { addPayment } = usePayment();
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [purchaseName, setPurchaseName] = useState('');
    const [purchasePhone, setPurchasePhone] = useState('');
    const [purchaseReceipt, setPurchaseReceipt] = useState<string | null>(null);

    // Mock cooking data
    const cookingProgress = 65;
    const [remainingTime, setRemainingTime] = useState(900); // 15 minutes in seconds
    const currentStep = 3;
    const totalSteps = 5;
    const stoveTemp = 180;
    const stirrerSpeed = 45;

    // Timer effects
    useEffect(() => {
        if (!isCooking) return;

        const interval = setInterval(() => {
            if (stoveStatus === 'running') {
                setStepTimer(prev => prev + 1);
                setRemainingTime(prev => Math.max(0, prev - 1));
                setPauseTimer(0);
            } else if (stoveStatus === 'paused' || stoveStatus === 'stopped') {
                setPauseTimer(prev => prev + 1);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isCooking, stoveStatus]);

    // Cooking steps data
    const cookingSteps = [
        { id: 1, title: 'Preheat oven', description: 'Set temperature to 180°C', status: 'completed' },
        { id: 2, title: 'Prepare ingredients', description: 'Chop vegetables and marinate meat', status: 'completed' },
        { id: 3, title: 'Simmering', description: 'Cook at medium heat for 10 minutes', status: 'current' },
        { id: 4, title: 'Add seasoning', description: 'Add salt, pepper, and herbs', status: 'pending' },
        { id: 5, title: 'Final cooking', description: 'Cook until golden brown', status: 'pending' },
    ];


    // Filter recipes based on selected filters
    const filteredOthersRecipes = useMemo(() => {
        return othersRecipes.filter(recipe => {
            if (priceFilter !== 'all') {
                const priceMap = { budget: '$', moderate: '$$', premium: '$$$' };
                if (recipe.price !== priceMap[priceFilter as keyof typeof priceMap]) return false;
            }
            if (ratingFilter !== 'all') {
                const minRating = ratingFilter === '3+' ? 3 : 4;
                if (recipe.rating < minRating) return false;
            }
            if (timeFilter !== 'all') {
                if (timeFilter === '<15' && recipe.time >= 15) return false;
                if (timeFilter === '15-30' && (recipe.time < 15 || recipe.time > 30)) return false;
                if (timeFilter === '30+' && recipe.time < 30) return false;
            }
            if (discoverSearch && !recipe.name.toLowerCase().includes(discoverSearch.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [discoverSearch, priceFilter, ratingFilter, timeFilter]);

    const filteredRecommendedRecipes = useMemo(() => {
        return recommendedRecipes.filter(recipe => {
            if (priceFilter !== 'all') {
                const priceMap = { budget: '$', moderate: '$$', premium: '$$$' };
                if (recipe.price !== priceMap[priceFilter as keyof typeof priceMap]) return false;
            }
            if (ratingFilter !== 'all') {
                const minRating = ratingFilter === '3+' ? 3 : 4;
                if (recipe.rating < minRating) return false;
            }
            if (timeFilter !== 'all') {
                if (timeFilter === '<15' && recipe.time >= 15) return false;
                if (timeFilter === '15-30' && (recipe.time < 15 || recipe.time > 30)) return false;
                if (timeFilter === '30+' && recipe.time < 30) return false;
            }
            if (discoverSearch && !recipe.name.toLowerCase().includes(discoverSearch.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [discoverSearch, priceFilter, ratingFilter, timeFilter]);

    const filteredTrendingRecipes = useMemo(() => {
        return trendingRecipes.filter(recipe => {
            if (priceFilter !== 'all') {
                const priceMap = { budget: '$', moderate: '$$', premium: '$$$' };
                if (recipe.price !== priceMap[priceFilter as keyof typeof priceMap]) return false;
            }
            if (ratingFilter !== 'all') {
                const minRating = ratingFilter === '3+' ? 3 : 4;
                if (recipe.rating < minRating) return false;
            }
            if (timeFilter !== 'all') {
                if (timeFilter === '<15' && recipe.time >= 15) return false;
                if (timeFilter === '15-30' && (recipe.time < 15 || recipe.time > 30)) return false;
                if (timeFilter === '30+' && recipe.time < 30) return false;
            }
            if (discoverSearch && !recipe.name.toLowerCase().includes(discoverSearch.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [discoverSearch, priceFilter, ratingFilter, timeFilter]);

    // Format time in MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStoveAction = (action: 'start' | 'stop' | 'pause' | 'resume') => {
        if (action === 'stop' || action === 'pause') {
            setPendingAction(action);
            setShowConfirmModal(true);
        } else if (action === 'start' || action === 'resume') {
            setStoveStatus('running');
        }
    };

    const confirmAction = () => {
        if (pendingAction === 'stop') {
            setStoveStatus('stopped');
        } else if (pendingAction === 'pause') {
            setStoveStatus('paused');
        }
        setShowConfirmModal(false);
        setPendingAction(null);
    };

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setPurchaseReceipt(result.assets[0].uri);
        }
    };

    const handlePurchaseConfirm = () => {
        if (!purchaseName || !purchasePhone) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please fill in all fields'
            });
            return;
        }

        addPayment({
            recipeName: selectedRecipe?.name || 'Unknown Recipe',
            amount: parseFloat(selectedRecipe?.price.replace('$', '') || '0') * (selectedRecipe?.price.length || 1) * 5, // Mock price calculation
            creator: selectedRecipe?.creator || 'Community Chef',
        });

        // Reset and close
        setPurchaseName('');
        setPurchasePhone('');
        setPurchaseReceipt(null);
        setShowPurchaseModal(false);
        setSelectedRecipe(null);
        Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Purchase pending! Check your payment history.'
        });
    };

    const cancelAction = () => {
        setShowConfirmModal(false);
        setPendingAction(null);
    };

    const renderRecipeCard = (recipe: any, isGridView: boolean = false) => (
        <TouchableOpacity
            key={recipe.id}
            style={[styles.recipeCard, { backgroundColor: colors.card }, isGridView && styles.recipeCardGrid]}
            onPress={() => setSelectedRecipe(recipe)}
        >
            <LinearGradient
                colors={[recipe.color1, recipe.color2]}
                style={styles.recipeImageGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Text style={styles.recipeEmoji}>{recipe.emoji}</Text>
            </LinearGradient>
            <View style={styles.recipeDetails}>
                <Text style={[styles.recipeName, { color: colors.text }]} numberOfLines={1}>{recipe.name}</Text>
                <View style={styles.recipeMetaRow}>
                    <View style={styles.recipeMetaItem}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>{recipe.rating}</Text>
                    </View>
                    <View style={styles.recipeMetaItem}>
                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>{recipe.time}m</Text>
                    </View>
                    <Text style={[styles.recipePriceText, { color: colors.text }]}>{recipe.price}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderFilterChip = (
        label: string,
        isActive: boolean,
        onPress: () => void
    ) => (
        <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.card, borderColor: isActive ? colors.primary : colors.border }, isActive && styles.filterChipActive]}
            onPress={onPress}
        >
            <Text style={[styles.filterChipText, { color: isActive ? '#fff' : colors.textSecondary }, isActive && styles.filterChipTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* Welcome */}
                <View style={styles.section}>
                    <Text style={[styles.welcome, { color: colors.text }]}>Your Kitchen Command Center 🍳</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Monitor your automated cooking and explore delicious recipes
                    </Text>
                </View>

                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'cooking' && [styles.tabActive, { backgroundColor: colors.inputBackground }]]}
                        onPress={() => setActiveTab('cooking')}
                    >
                        <Ionicons
                            name="flame"
                            size={20}
                            color={activeTab === 'cooking' ? '#E53935' : colors.textSecondary}
                        />
                        <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'cooking' && styles.tabTextActive]}>
                            Cooking Mode
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'discover' && [styles.tabActive, { backgroundColor: colors.inputBackground }]]}
                        onPress={() => setActiveTab('discover')}
                    >
                        <Ionicons
                            name="compass"
                            size={20}
                            color={activeTab === 'discover' ? '#E53935' : colors.textSecondary}
                        />
                        <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'discover' && styles.tabTextActive]}>
                            Discover
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                {activeTab === 'discover' ? (
                    <>
                        {/* Search Bar */}
                        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="search" size={20} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search new flavors..."
                                placeholderTextColor={colors.textSecondary}
                                value={discoverSearch}
                                onChangeText={setDiscoverSearch}
                            />
                            {discoverSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setDiscoverSearch('')}>
                                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                ) : null}

                {/* Cooking Mode Tab */}
                {activeTab === 'cooking' && (
                    <View style={styles.section}>
                        {/* Toggle Switch */}
                        <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
                            <View>
                                <Text style={[styles.toggleLabel, { color: colors.text }]}>Cooking Status</Text>
                                <Text style={[styles.toggleSubtext, { color: colors.textSecondary }]}>
                                    {isCooking ? 'Meal in progress' : 'No active cooking'}
                                </Text>
                            </View>
                            <Switch
                                value={isCooking}
                                onValueChange={setIsCooking}
                                trackColor={{ false: '#3a3a3a', true: '#E5393580' }}
                                thumbColor={isCooking ? '#E53935' : '#f4f3f4'}
                            />
                        </View>

                        {isCooking ? (
                            <>
                                {/* Progress Card */}
                                <TouchableOpacity
                                    style={[styles.card, { backgroundColor: colors.card }]}
                                    onPress={() => setShowSteps(!showSteps)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.cardHeader}>
                                        <Text style={[styles.cardTitle, { color: colors.text }]}>Cooking Progress</Text>
                                        <Ionicons
                                            name={showSteps ? "chevron-up" : "chevron-down"}
                                            size={24}
                                            color="#aaa"
                                        />
                                    </View>
                                    <View style={styles.progressContainer}>
                                        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                                            <View style={[styles.progressFill, { width: `${cookingProgress}%` }]} />
                                        </View>
                                        <Text style={[styles.progressText, { color: colors.text }]}>{cookingProgress}%</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoItem}>
                                            <Ionicons name="time-outline" size={18} color="#E53935" />
                                            <Text style={[styles.infoText, { color: colors.text }]}>{formatTime(remainingTime)} remaining</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Ionicons name="list-outline" size={18} color="#E53935" />
                                            <Text style={[styles.infoText, { color: colors.text }]}>Step {currentStep} of {totalSteps}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>Simmering ingredients at medium heat</Text>

                                    {showSteps && (
                                        <View style={styles.stepsContainer}>
                                            <View style={styles.stepsDivider} />
                                            {cookingSteps.map((step, index) => (
                                                <View key={step.id} style={styles.stepItem}>
                                                    <View style={styles.stepIndicatorContainer}>
                                                        <View
                                                            style={[
                                                                styles.stepIndicator,
                                                                step.status === 'completed' && styles.stepIndicatorCompleted,
                                                                step.status === 'current' && styles.stepIndicatorCurrent,
                                                                step.status === 'pending' && styles.stepIndicatorPending,
                                                            ]}
                                                        >
                                                            {step.status === 'completed' ? (
                                                                <Ionicons name="checkmark" size={16} color="#fff" />
                                                            ) : (
                                                                <Text style={styles.stepNumber}>{step.id}</Text>
                                                            )}
                                                        </View>
                                                        {index < cookingSteps.length - 1 && (
                                                            <View
                                                                style={[
                                                                    styles.stepConnector,
                                                                    step.status === 'completed' && styles.stepConnectorCompleted,
                                                                ]}
                                                            />
                                                        )}
                                                    </View>
                                                    <View style={styles.stepContent}>
                                                        <View style={styles.stepTitleRow}>
                                                            <Text
                                                                style={[
                                                                    styles.stepTitle,
                                                                    { color: colors.text },
                                                                    step.status === 'completed' && styles.stepTitleCompleted,
                                                                    step.status === 'current' && (stoveStatus === 'running' ? styles.stepTitleCurrent : styles.stepTitlePaused),
                                                                    step.status === 'pending' && styles.stepTitlePending,
                                                                ]}
                                                            >
                                                                {step.title}
                                                            </Text>
                                                            {step.status === 'current' && (
                                                                <View style={styles.stepTimers}>
                                                                    {stoveStatus === 'running' && (
                                                                        <View style={styles.timerBadge}>
                                                                            <Ionicons name="time" size={12} color="#FF9800" />
                                                                            <Text style={styles.timerText}>{formatTime(stepTimer)}</Text>
                                                                        </View>
                                                                    )}
                                                                    {(stoveStatus === 'paused' || stoveStatus === 'stopped') && pauseTimer > 0 && (
                                                                        <View style={[styles.timerBadge, styles.pauseTimerBadge]}>
                                                                            <Ionicons name="pause" size={12} color="#E53935" />
                                                                            <Text style={[styles.timerText, styles.pauseTimerText]}>{formatTime(pauseTimer)}</Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text
                                                            style={[
                                                                styles.stepDescriptionText,
                                                                step.status === 'current' && styles.stepDescriptionCurrent,
                                                            ]}
                                                        >
                                                            {step.description}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* Stove Controls */}
                                <View style={[styles.card, { backgroundColor: colors.card }]}>
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>Stove Controls</Text>
                                    <View style={styles.controlsRow}>
                                        {stoveStatus === 'stopped' && (
                                            <TouchableOpacity
                                                style={[styles.controlButton, styles.controlButtonStart]}
                                                onPress={() => handleStoveAction('start')}
                                            >
                                                <Ionicons name="play" size={24} color="#fff" />
                                                <Text style={[styles.controlButtonText, styles.controlButtonTextActive]}>
                                                    Start
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {stoveStatus === 'running' && (
                                            <>
                                                <TouchableOpacity
                                                    style={[styles.controlButton, styles.controlButtonPause]}
                                                    onPress={() => handleStoveAction('pause')}
                                                >
                                                    <Ionicons name="pause" size={24} color="#fff" />
                                                    <Text style={[styles.controlButtonText, styles.controlButtonTextActive]}>
                                                        Pause
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.controlButton, styles.controlButtonStop]}
                                                    onPress={() => handleStoveAction('stop')}
                                                >
                                                    <Ionicons name="stop" size={24} color="#fff" />
                                                    <Text style={[styles.controlButtonText, styles.controlButtonTextActive]}>
                                                        Stop
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                        {stoveStatus === 'paused' && (
                                            <>
                                                <TouchableOpacity
                                                    style={[styles.controlButton, styles.controlButtonResume]}
                                                    onPress={() => handleStoveAction('resume')}
                                                >
                                                    <Ionicons name="play" size={24} color="#fff" />
                                                    <Text style={[styles.controlButtonText, styles.controlButtonTextActive]}>
                                                        Resume
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.controlButton, styles.controlButtonStop]}
                                                    onPress={() => handleStoveAction('stop')}
                                                >
                                                    <Ionicons name="stop" size={24} color="#fff" />
                                                    <Text style={[styles.controlButtonText, styles.controlButtonTextActive]}>
                                                        Stop
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </View>

                                {/* Status Indicators */}
                                <View style={styles.statusGrid}>
                                    <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
                                        <View style={[
                                            styles.statusIconContainer,
                                            stoveStatus === 'running' ? styles.statusIconRunning :
                                                stoveStatus === 'paused' ? styles.statusIconPaused : styles.statusIconStopped
                                        ]}>
                                            <Ionicons
                                                name={stoveStatus === 'running' ? 'flame' : stoveStatus === 'paused' ? 'pause' : 'stop-circle'}
                                                size={24}
                                                color={stoveStatus === 'running' ? '#4CAF50' : stoveStatus === 'paused' ? '#FF9800' : '#E53935'}
                                            />
                                        </View>
                                        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Stove Status</Text>
                                        <Text style={[
                                            styles.statusValue,
                                            stoveStatus === 'running' ? styles.statusRunning :
                                                stoveStatus === 'paused' ? styles.statusPausedText : styles.statusStopped
                                        ]}>
                                            {stoveStatus === 'running' ? 'RUNNING' : stoveStatus === 'paused' ? 'PAUSED' : 'STOPPED'}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
                                        <View style={[styles.tempGaugeContainer, { borderColor: colors.border }]}>
                                            <View style={[styles.tempGauge, { backgroundColor: colors.border }]}>
                                                <View style={[styles.tempFill, { height: `${(stoveTemp / 250) * 100}%` }]} />
                                            </View>
                                            <Ionicons name="thermometer" size={20} color="#FF9800" style={styles.tempIcon} />
                                        </View>
                                        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Temperature</Text>
                                        <Text style={[styles.statusValue, styles.tempValue, { color: colors.text }]}>{stoveTemp}°C</Text>
                                        <View style={styles.tempRange}>
                                            <Text style={[styles.tempRangeText, { color: colors.textSecondary }]}>0°</Text>
                                            <Text style={[styles.tempRangeText, { color: colors.textSecondary }]}>250°</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
                                        <View style={[styles.speedGaugeContainer, { borderColor: colors.border }]}>
                                            <View style={[styles.speedGauge, { borderRightColor: colors.border, borderBottomColor: colors.border }]}>
                                                <View style={[styles.speedArc, { transform: [{ rotate: `${(stirrerSpeed / 100) * 180}deg` }] }]} />
                                            </View>
                                            <Ionicons name="sync" size={20} color="#4CAF50" style={styles.speedIcon} />
                                        </View>
                                        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Stirrer Speed</Text>
                                        <Text style={[styles.statusValue, styles.speedValue, { color: colors.text }]}>{stirrerSpeed} RPM</Text>
                                        <Text style={[styles.statusSubtext, { color: colors.textSecondary }]}>Medium</Text>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="restaurant-outline" size={64} color={colors.textSecondary} />
                                <Text style={[styles.emptyStateText, { color: colors.text }]}>No meal is being cooked at the moment</Text>
                                <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>Toggle the switch above to start cooking</Text>
                            </View>
                        )}

                        {/* Confirmation Modal */}
                        <Modal
                            visible={showConfirmModal}
                            transparent
                            animationType="fade"
                            onRequestClose={cancelAction}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalContent}>
                                    <Ionicons
                                        name="warning"
                                        size={48}
                                        color="#FF9800"
                                        style={styles.modalIcon}
                                    />
                                    <Text style={styles.modalTitle}>
                                        {pendingAction === 'stop' ? 'Stop Cooking?' : 'Pause Cooking?'}
                                    </Text>
                                    <Text style={styles.modalMessage}>
                                        {pendingAction === 'stop'
                                            ? 'Are you sure you want to stop the cooking process? This will halt all operations.'
                                            : 'Are you sure you want to pause? The cooking process will be temporarily halted.'}
                                    </Text>
                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.modalButtonCancel]}
                                            onPress={cancelAction}
                                        >
                                            <Text style={styles.modalButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.modalButtonConfirm]}
                                            onPress={confirmAction}
                                        >
                                            <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                                                {pendingAction === 'stop' ? 'Stop' : 'Pause'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Modal>
                    </View>
                )}

                {/* Discover Tab Content */}
                {activeTab === 'discover' && (
                    <View style={styles.section}>
                        {/* Filters */}
                        <View style={styles.filtersSection}>
                            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>Price</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                                {renderFilterChip('All', priceFilter === 'all', () => setPriceFilter('all'))}
                                {renderFilterChip('Budget ($)', priceFilter === 'budget', () => setPriceFilter('budget'))}
                                {renderFilterChip('Moderate ($$)', priceFilter === 'moderate', () => setPriceFilter('moderate'))}
                                {renderFilterChip('Premium ($$$)', priceFilter === 'premium', () => setPriceFilter('premium'))}
                            </ScrollView>

                            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>Rating</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                                {renderFilterChip('All Ratings', ratingFilter === 'all', () => setRatingFilter('all'))}
                                {renderFilterChip('3+ Stars', ratingFilter === '3+', () => setRatingFilter('3+'))}
                                {renderFilterChip('4+ Stars', ratingFilter === '4+', () => setRatingFilter('4+'))}
                            </ScrollView>

                            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>Time</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                                {renderFilterChip('All Times', timeFilter === 'all', () => setTimeFilter('all'))}
                                {renderFilterChip('Under 15 min', timeFilter === '<15', () => setTimeFilter('<15'))}
                                {renderFilterChip('15-30 min', timeFilter === '15-30', () => setTimeFilter('15-30'))}
                                {renderFilterChip('30+ min', timeFilter === '30+', () => setTimeFilter('30+'))}
                            </ScrollView>
                        </View>

                        {/* What Others Are Cooking */}
                        <View style={styles.recipeSection}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>What Others Are Cooking</Text>
                                <TouchableOpacity onPress={() => setExpandedSection(expandedSection === 'others' ? null : 'others')}>
                                    <Text style={styles.seeAllText}>{expandedSection === 'others' ? 'Show Less' : 'See All'}</Text>
                                </TouchableOpacity>
                            </View>
                            {filteredOthersRecipes.length === 0 ? (
                                <View style={styles.emptyFilterState}>
                                    <Ionicons name="search-outline" size={32} color="#555" />
                                    <Text style={styles.emptyFilterText}>No recipes match your filters</Text>
                                    <Text style={styles.emptyFilterSubtext}>Try adjusting your filter criteria</Text>
                                </View>
                            ) : expandedSection === 'others' ? (
                                <View style={styles.recipeGrid}>
                                    {filteredOthersRecipes.map(recipe => renderRecipeCard(recipe, true))}
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipeScroll}>
                                    {filteredOthersRecipes.map(recipe => renderRecipeCard(recipe, false))}
                                </ScrollView>
                            )}
                        </View>

                        {/* Recommended Foods */}
                        <View style={styles.recipeSection}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended For You</Text>
                                <TouchableOpacity onPress={() => setExpandedSection(expandedSection === 'recommended' ? null : 'recommended')}>
                                    <Text style={styles.seeAllText}>{expandedSection === 'recommended' ? 'Show Less' : 'See All'}</Text>
                                </TouchableOpacity>
                            </View>
                            {filteredRecommendedRecipes.length === 0 ? (
                                <View style={styles.emptyFilterState}>
                                    <Ionicons name="search-outline" size={32} color="#555" />
                                    <Text style={styles.emptyFilterText}>No recipes match your filters</Text>
                                    <Text style={styles.emptyFilterSubtext}>Try adjusting your filter criteria</Text>
                                </View>
                            ) : expandedSection === 'recommended' ? (
                                <View style={styles.recipeGrid}>
                                    {filteredRecommendedRecipes.map(recipe => renderRecipeCard(recipe, true))}
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipeScroll}>
                                    {filteredRecommendedRecipes.map(recipe => renderRecipeCard(recipe, false))}
                                </ScrollView>
                            )}
                        </View>

                        {/* Trending This Week */}
                        <View style={styles.recipeSection}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.trendingHeader}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending This Week</Text>
                                    <View style={styles.trendingBadge}>
                                        <Ionicons name="trending-up" size={12} color="#E53935" />
                                        <Text style={styles.trendingBadgeText}>HOT</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setExpandedSection(expandedSection === 'trending' ? null : 'trending')}>
                                    <Text style={styles.seeAllText}>{expandedSection === 'trending' ? 'Show Less' : 'See All'}</Text>
                                </TouchableOpacity>
                            </View>
                            {filteredTrendingRecipes.length === 0 ? (
                                <View style={styles.emptyFilterState}>
                                    <Ionicons name="search-outline" size={32} color="#555" />
                                    <Text style={styles.emptyFilterText}>No recipes match your filters</Text>
                                    <Text style={styles.emptyFilterSubtext}>Try adjusting your filter criteria</Text>
                                </View>
                            ) : expandedSection === 'trending' ? (
                                <View style={styles.recipeGrid}>
                                    {filteredTrendingRecipes.map(recipe => renderRecipeCard(recipe, true))}
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipeScroll}>
                                    {filteredTrendingRecipes.map(recipe => renderRecipeCard(recipe, false))}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Recipe Details Modal */}
            {
                selectedRecipe && (
                    <Modal
                        visible={!!selectedRecipe}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setSelectedRecipe(null)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                                <View style={styles.detailsHeader}>
                                    <LinearGradient
                                        colors={[selectedRecipe.color1 || '#333', selectedRecipe.color2 || '#111']}
                                        style={styles.detailsGradient}
                                    >
                                        <Text style={styles.detailsEmoji}>{selectedRecipe.emoji}</Text>
                                    </LinearGradient>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() => setSelectedRecipe(null)}
                                    >
                                        <Ionicons name="close" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={[styles.detailsTitle, { color: colors.text }]}>{selectedRecipe.name}</Text>
                                <Text style={[styles.detailsCreator, { color: colors.textSecondary }]}>by {selectedRecipe.creator || 'Master Chef'}</Text>

                                <View style={[styles.detailsStats, { backgroundColor: colors.inputBackground }]}>
                                    <View style={styles.statItem}>
                                        <Ionicons name="people" size={16} color={colors.textSecondary} />
                                        <Text style={[styles.statValue, { color: colors.text }]}>1.2k</Text>
                                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Used</Text>
                                    </View>
                                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                                    <View style={styles.statItem}>
                                        <Ionicons name="time" size={16} color={colors.textSecondary} />
                                        <Text style={[styles.statValue, { color: colors.text }]}>{selectedRecipe.time}</Text>
                                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Time</Text>
                                    </View>
                                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                                    <View style={styles.statItem}>
                                        <Ionicons name="star" size={16} color={colors.textSecondary} />
                                        <Text style={[styles.statValue, { color: colors.text }]}>{selectedRecipe.rating}</Text>
                                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
                                    </View>
                                </View>

                                <Text style={[styles.detailsPrice, { color: colors.text }]}>{selectedRecipe.price}</Text>

                                <TouchableOpacity
                                    style={styles.buyButton}
                                    onPress={() => {
                                        setSelectedRecipe(null);
                                        setTimeout(() => setShowPurchaseModal(true), 300); // Wait for close anim
                                    }}
                                >
                                    <Text style={styles.buyButtonText}>Buy Recipe</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                )
            }

            {/* Purchase Form Modal */}
            <Modal
                visible={showPurchaseModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPurchaseModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Complete Purchase</Text>
                        <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>Enter your details and upload payment receipt</Text>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                placeholder="John Doe"
                                placeholderTextColor={colors.textSecondary}
                                value={purchaseName}
                                onChangeText={setPurchaseName}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                placeholder="+1 234 567 8900"
                                placeholderTextColor={colors.textSecondary}
                                value={purchasePhone}
                                onChangeText={setPurchasePhone}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.uploadButton, { borderColor: colors.border }, purchaseReceipt && styles.uploadButtonSuccess]}
                            onPress={pickImage}
                        >
                            {purchaseReceipt ? (
                                <Image source={{ uri: purchaseReceipt }} style={styles.receiptPreview} />
                            ) : (
                                <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                            )}
                            <Text style={[styles.uploadText, { color: colors.textSecondary }, purchaseReceipt && styles.uploadTextActive]}>
                                {purchaseReceipt ? 'Receipt Selected (Tap to change)' : 'Upload Receipt Image'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowPurchaseModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={handlePurchaseConfirm}
                            >
                                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                                    Confirm
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0B0F',
        padding: 20,
    },

    section: {
        marginBottom: 28,
    },

    welcome: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '700',
    },

    subtitle: {
        color: '#aaa',
        marginTop: 6,
    },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#15151C',
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
    },

    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },

    tabActive: {
        backgroundColor: '#1f1f28',
    },

    tabText: {
        color: '#aaa',
        fontSize: 14,
        fontWeight: '600',
    },

    tabTextActive: {
        color: '#E53935',
    },

    // Toggle
    toggleContainer: {
        backgroundColor: '#ffffffff',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },

    toggleLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    toggleSubtext: {
        color: '#aaa',
        fontSize: 13,
        marginTop: 4,
    },

    // Cards
    card: {
        backgroundColor: '#15151C',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
    },

    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },

    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },

    // Progress
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },

    progressBar: {
        flex: 1,
        height: 10,
        backgroundColor: '#2a2a2a',
        borderRadius: 5,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#E53935',
        borderRadius: 5,
    },

    progressText: {
        color: '#E53935',
        fontSize: 16,
        fontWeight: '700',
        minWidth: 45,
    },

    infoRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },

    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    infoText: {
        color: '#bbb',
        fontSize: 14,
    },

    stepDescription: {
        color: '#aaa',
        fontSize: 14,
        fontStyle: 'italic',
    },

    // Controls
    controlsRow: {
        flexDirection: 'row',
        gap: 12,
    },

    controlButton: {
        flex: 1,
        backgroundColor: '#1f1f28',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },

    controlButtonOn: {
        backgroundColor: '#E53935',
        borderColor: '#E53935',
    },

    controlButtonOff: {
        backgroundColor: '#555',
        borderColor: '#555',
    },

    controlButtonText: {
        color: '#aaa',
        fontWeight: '700',
        fontSize: 14,
    },

    controlButtonTextOn: {
        color: '#fff',
    },

    controlButtonTextOff: {
        color: '#fff',
    },

    // Status Grid
    statusGrid: {
        flexDirection: 'row',
        gap: 12,
    },

    statusCard: {
        flex: 1,
        backgroundColor: '#15151C',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },

    statusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1f1f28',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },

    statusLabel: {
        color: '#aaa',
        fontSize: 12,
        marginBottom: 6,
    },

    statusValue: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },

    statusOn: {
        color: '#4CAF50',
    },

    statusOff: {
        color: '#999',
    },

    statusSubtext: {
        color: '#777',
        fontSize: 11,
        marginTop: 2,
    },

    // Empty State
    emptyState: {
        backgroundColor: '#15151C',
        borderRadius: 18,
        padding: 48,
        alignItems: 'center',
        marginTop: 20,
    },

    emptyStateText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },

    emptyStateSubtext: {
        color: '#777',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },

    // Filters
    filtersSection: {
        marginBottom: 24,
    },

    filterSectionTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
        marginTop: 12,
    },

    filterRow: {
        marginBottom: 8,
    },

    filterChip: {
        backgroundColor: '#15151C',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },

    filterChipActive: {
        backgroundColor: '#E53935',
        borderColor: '#E53935',
    },

    filterChipText: {
        color: '#aaa',
        fontSize: 13,
        fontWeight: '600',
    },

    filterChipTextActive: {
        color: '#fff',
    },

    // Recipe Sections
    recipeSection: {
        marginBottom: 28,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        padding: 0,
    },

    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },

    trendingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    trendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E5393520',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },

    trendingBadgeText: {
        color: '#E53935',
        fontSize: 10,
        fontWeight: '800',
    },

    seeAllText: {
        color: '#E53935',
        fontSize: 14,
        fontWeight: '600',
    },

    recipeScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },

    // Recipe Cards
    recipeCard: {
        width: 160,
        marginRight: 14,
        backgroundColor: '#15151C',
        borderRadius: 16,
        overflow: 'hidden',
    },

    recipeImageGradient: {
        width: '100%',
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },

    recipeEmoji: {
        fontSize: 48,
    },

    recipeDetails: {
        padding: 12,
    },

    recipeName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },

    recipeMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    recipeMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },

    recipeMetaText: {
        color: '#aaa',
        fontSize: 11,
    },

    recipePriceText: {
        color: '#4CAF50',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 'auto',
    },

    // Cooking Steps
    stepsContainer: {
        marginTop: 20,
    },

    stepsDivider: {
        height: 1,
        backgroundColor: '#2a2a2a',
        marginBottom: 20,
    },

    stepItem: {
        flexDirection: 'row',
        marginBottom: 24,
    },

    stepIndicatorContainer: {
        alignItems: 'center',
        marginRight: 16,
    },

    stepIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },

    stepIndicatorCompleted: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },

    stepIndicatorCurrent: {
        backgroundColor: '#FF9800',
        borderColor: '#FF9800',
    },

    stepIndicatorPending: {
        backgroundColor: 'transparent',
        borderColor: '#555',
    },

    stepNumber: {
        color: '#555',
        fontSize: 14,
        fontWeight: '700',
    },

    stepConnector: {
        width: 2,
        flex: 1,
        backgroundColor: '#555',
        marginTop: 4,
    },

    stepConnectorCompleted: {
        backgroundColor: '#4CAF50',
    },

    stepContent: {
        flex: 1,
        paddingTop: 4,
    },

    stepTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },

    stepTitleCompleted: {
        color: '#4CAF50',
        textDecorationLine: 'line-through',
    },

    stepTitleCurrent: {
        color: '#FF9800',
    },

    stepTitlePending: {
        color: '#888',
    },

    stepDescriptionText: {
        fontSize: 13,
        color: '#777',
    },

    stepDescriptionCurrent: {
        color: '#aaa',
    },

    // Step Timers
    stepTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },

    stepTitlePaused: {
        color: '#E53935',
    },

    stepTimers: {
        flexDirection: 'row',
        gap: 8,
    },

    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF980020',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },

    pauseTimerBadge: {
        backgroundColor: '#E5393520',
    },

    timerText: {
        color: '#FF9800',
        fontSize: 11,
        fontWeight: '700',
    },

    pauseTimerText: {
        color: '#E53935',
    },

    stepIndicatorPaused: {
        backgroundColor: '#E53935',
        borderColor: '#E53935',
    },

    // Control Buttons
    controlButtonStart: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },

    controlButtonPause: {
        backgroundColor: '#FF9800',
        borderColor: '#FF9800',
    },

    controlButtonStop: {
        backgroundColor: '#E53935',
        borderColor: '#E53935',
    },

    controlButtonResume: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },

    controlButtonTextActive: {
        color: '#fff',
    },

    // Status Icons
    statusIconRunning: {
        backgroundColor: '#4CAF5020',
    },

    statusIconPaused: {
        backgroundColor: '#FF980020',
    },

    statusIconStopped: {
        backgroundColor: '#E5393520',
    },

    statusRunning: {
        color: '#4CAF50',
    },

    statusPausedText: {
        color: '#FF9800',
    },

    statusStopped: {
        color: '#E53935',
    },

    // Temperature Gauge
    tempGaugeContainer: {
        width: 48,
        height: 48,
        marginBottom: 12,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },

    tempGauge: {
        width: 12,
        height: 40,
        backgroundColor: '#2a2a2a',
        borderRadius: 6,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },

    tempFill: {
        width: '100%',
        backgroundColor: '#FF9800',
        borderRadius: 6,
    },

    tempIcon: {
        position: 'absolute',
    },

    tempValue: {
        color: '#FF9800',
    },

    tempRange: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 4,
        paddingHorizontal: 4,
    },

    tempRangeText: {
        color: '#555',
        fontSize: 9,
    },

    // Speed Gauge
    speedGaugeContainer: {
        width: 48,
        height: 48,
        marginBottom: 12,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },

    speedGauge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 4,
        borderColor: '#2a2a2a',
        alignItems: 'center',
        justifyContent: 'center',
    },

    speedArc: {
        width: 2,
        height: 16,
        backgroundColor: '#4CAF50',
        position: 'absolute',
        bottom: 12,
        transformOrigin: 'bottom',
    },

    speedIcon: {
        position: 'absolute',
    },

    speedValue: {
        color: '#4CAF50',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    modalContent: {
        backgroundColor: '#15151C',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },

    modalIcon: {
        marginBottom: 16,
    },

    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },

    modalMessage: {
        color: '#aaa',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },

    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },

    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },

    modalButtonCancel: {
        backgroundColor: '#2a2a2a',
    },

    modalButtonConfirm: {
        backgroundColor: '#E53935',
    },

    modalButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },

    modalButtonTextConfirm: {
        color: '#fff',
    },

    // Recipe Grid
    recipeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
        marginTop: 8,
    },

    recipeCardGrid: {
        width: '100%',
        marginRight: 0,
        marginBottom: 14,
    },

    // Empty Filter State
    emptyFilterState: {
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#15151C',
        borderRadius: 16,
        marginTop: 8,
    },

    emptyFilterText: {
        color: '#aaa',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
    },

    emptyFilterSubtext: {
        color: '#777',
        fontSize: 12,
        marginTop: 4,
    },

    // Details Modal
    detailsHeader: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    detailsGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    detailsEmoji: {
        fontSize: 48,
    },
    closeButton: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#333',
        borderRadius: 20,
        padding: 4,
    },
    detailsTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'center',
    },
    detailsCreator: {
        color: '#E53935',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 20,
    },
    detailsStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 24,
        backgroundColor: '#1E1E26',
        paddingVertical: 12,
        borderRadius: 12,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#333',
    },
    statValue: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        marginVertical: 2,
    },
    statLabel: {
        color: '#777',
        fontSize: 11,
    },
    detailsPrice: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 24,
    },
    buyButton: {
        backgroundColor: '#4CAF50',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    buyButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    // Purchase Form
    inputContainer: {
        width: '100%',
        marginBottom: 16,
    },
    inputLabel: {
        color: '#aaa',
        fontSize: 12,
        marginBottom: 6,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#222',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#333',
    },
    uploadButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 12,
        borderStyle: 'dashed',
        marginBottom: 24,
        marginTop: 8,
        overflow: 'hidden',
    },
    uploadButtonSuccess: {
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderStyle: 'solid',
    },
    uploadText: {
        color: '#aaa',
        fontSize: 14,
    },
    uploadTextActive: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    receiptPreview: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
});

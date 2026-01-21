import { StyleSheet, Text, View } from 'react-native';

export default function RecipesScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>this is the recipe page</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});

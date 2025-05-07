import { StyleSheet } from 'react-native';

// This is the new global stylesheet for the UI update.
// All new styles will be added here.

const globalStyles = StyleSheet.create({
  // Welcome 1 Screen Styles
  welcome1Container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#D1E7FF',
  },
  welcome1Illustration: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  welcome1TextContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome1TitlePart1: {
    fontSize: 48,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    color: '#000000',
  },
  welcome1TitlePart2: {
    fontFamily: 'GochiHand_400Regular', // Ensure Gochi Hand is loaded
    fontSize: 68,
    textAlign: 'center',
    color: '#000000',
    lineHeight: 68,
  },
  welcome1ProgressContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  welcome1Dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
    marginHorizontal: 5,
  },
  welcome1ActiveDot: {
    backgroundColor: '#0775FF',
  },
  welcome1Button: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 1000,
    width: '90%',
    alignItems: 'center',
  },
  welcome1ButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter_500Medium',
  },
  // Welcome 2 Screen Styles
  welcome2Container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#FFF8D1',
  },
  welcome2Illustration: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  welcome2TextContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome2Title: {
    fontSize: 48,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    color: '#000000',
    lineHeight: 52,
  },
  welcome2ProgressContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  welcome2Dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
    marginHorizontal: 5,
  },
  welcome2ActiveDot: {
    backgroundColor: '#FABD00',
  },
  welcome2Button: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 1000,
    width: '90%',
    alignItems: 'center',
  },
  welcome2ButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter_500Medium',
  },
  // Welcome 3 Screen Styles
  welcome3Container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#FFD2D1',
  },
  welcome3Illustration: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  welcome3TextContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome3Title: {
    fontSize: 48,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    color: '#000000',
    lineHeight: 52,
  },
  welcome3ProgressContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  welcome3Dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
    marginHorizontal: 5,
  },
  welcome3ActiveDot: {
    backgroundColor: '#FF0C07',
  },
  welcome3Button: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 1000,
    width: '90%',
    alignItems: 'center',
  },
  welcome3ButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter_500Medium',
  },
  // Welcome 4 Screen Styles
  welcome4Container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#E0D5FE',
  },
  welcome4Illustration: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  welcome4TextContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome4Title: {
    fontSize: 48,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    color: '#000000',
    lineHeight: 52,
  },
  welcome4ProgressContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  welcome4Dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
    marginHorizontal: 5,
  },
  welcome4ActiveDot: {
    backgroundColor: '#4F19F9',
  },
  welcome4Button: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 1000,
    width: '90%',
    alignItems: 'center',
  },
  welcome4ButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter_500Medium',
  },
  // Welcome 5 Screen Styles
  welcome5Container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#CCFCD1',
  },
  welcome5Illustration: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  welcome5TextContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome5Title: {
    fontSize: 48,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    color: '#000000',
    lineHeight: 52,
  },
  welcome5ButtonContainer: {
    width: '90%',
    alignItems: 'center',
  },
  welcome5Button: { // For "Create account"
    backgroundColor: '#000000',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 1000,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  welcome5ButtonText: { // For "Create account" text
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter_500Medium',
  },
  welcome5LoginButton: { // For "Log in" button
    backgroundColor: 'transparent',
    borderColor: '#000000',
    borderWidth: 2,
  },
  welcome5LoginButtonText: { // For "Log in" text
    color: '#000000',
    fontFamily: 'Inter_500Medium', // Assuming same style as other buttons
    fontSize: 24, // Assuming same style as other buttons
  }
  // Styles for other screens will be added here
});

export default globalStyles;

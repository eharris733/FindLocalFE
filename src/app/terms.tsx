import { ScrollView, Linking } from "react-native";
import { Text } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

export default function TermsRoute() {
  const { theme } = useTheme();
  
  return (
    <ScrollView 
      style={{ 
        flex: 1, 
        backgroundColor: theme.colors.background.primary 
      }}
      contentContainerStyle={{ 
        padding: theme.spacing.lg 
      }}
    >
      <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>Terms of Service</Text>
      
      <Text variant="body2" color="secondary" style={{ marginBottom: theme.spacing.xl, fontStyle: 'italic' }}>
        Last Updated: October 14, 2025
      </Text>

      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        Welcome to FindLocal. These Terms of Service ("Terms") govern your access to and use of the findlocal.community website and services (the "Service"), operated by FindLocal LLC (pending registration).
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        1. Acceptance of Terms
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not use the Service.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        2. Eligibility and User Accounts
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>Age Requirement:</Text> You must be at least 13 years old to use the Service.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>Account Responsibility:</Text> You are responsible for safeguarding your password and for all activities that occur under your account. You agree to provide accurate and verifiable contact information, including a valid email address.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        3. Acceptable Use Policy
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        You agree not to use the Service to:
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Create false events, fake accounts, or post misleading information.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Harass, threaten, or harm another individual.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Use the Service for any illegal purpose or in violation of any local, state, national, or international law.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Attempt to gain unauthorized access to our systems or engage in any activity that disrupts the Service.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Send spam or use the friend invitation feature for unmediated advertising or in an excessive manner.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        We reserve the right to limit, suspend, or terminate accounts that violate this policy at our sole discretion.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        4. Content and Intellectual Property
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>Our Content:</Text> The Service and its original content, features, branding, and functionality are and will remain the exclusive property of FindLocal LLC and its licensors.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>User Content:</Text> If you post content, such as creating a custom event, you retain ownership of your content. However, you grant FindLocal a worldwide, non-exclusive, royalty-free license to use, reproduce, display, and distribute such content in connection with the Service.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>Content Disclaimer:</Text> The Service displays information scraped from public calendars and created by users. We do not guarantee the accuracy, completeness, or timeliness of any information on our Service, including event times, locations, and descriptions. We are not responsible for false, outdated, or misleading content. We strongly advise all users to visit the official website of any venue or event to verify all details before attending.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        5. Termination
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>By You:</Text> You may terminate this agreement at any time by deleting your account through the Service.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>By Us:</Text> We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. We reserve the right to remove any account that we deem to be problematic, disruptive, offensive, or otherwise undesirable, without written justification.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        6. Paid Services and Refunds
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        If paid accounts or features are offered, we will refund payment up to the last billing cycle for users who terminate their accounts. However, if an account is terminated by us due to a clear violation of these Terms, no refund will be issued.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        7. Disclaimer of Warranties and Limitation of Liability
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        The Service is provided on an "AS IS" and "AS AVAILABLE" basis. FindLocal LLC is not liable for any financial loss or other damages resulting from your use of this site or from inaccurate event information.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        8. Governing Law and Dispute Resolution
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        These Terms shall be governed by the laws of the Commonwealth of Massachusetts and the United States, without regard to its conflict of law provisions. You agree that different data protection laws may apply depending on your location.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        9. Changes to Terms
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page and updating the "Last Updated" date. For material changes, we will also provide notice to you via the email address associated with your account.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        10. Contact Us
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
        If you have any questions about these Terms, please contact us at:{' '}
        <Text 
          style={{ textDecorationLine: 'underline', color: theme.colors.primary[500] }} 
          onPress={() => Linking.openURL('mailto:findlocalinternal@gmail.com')}
        >
          findlocalinternal@gmail.com
        </Text>
      </Text>
    </ScrollView>
  );
}

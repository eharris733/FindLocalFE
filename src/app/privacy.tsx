import { ScrollView, Linking } from "react-native";
import { Text } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyRoute() {
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
      <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>Privacy Policy</Text>
      
      <Text variant="body2" color="secondary" style={{ marginBottom: theme.spacing.xl, fontStyle: 'italic' }}>
        Last Updated: October 14, 2025
      </Text>

      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        Welcome to FindLocal ("FindLocal," "we," "us," or "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website findlocal.community and use our services (collectively, the "Service"). Please read this privacy policy carefully.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        1. Information We Collect
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        We may collect information about you in a variety of ways.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>Personal Data You Provide to Us:</Text>
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>Account Information:</Text> When you register for an account, we require a valid email address and a password. You may optionally provide additional information, such as a name, profile photos, general location (city), phone contact lists for friend invites, or social media handles. An account is required to access certain features like saving preferences, creating custom events, and inviting friends.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>Communications:</Text> If you contact us directly, we may receive additional information about you.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>Data Collected Automatically:</Text>
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>Log and Usage Data:</Text> We automatically collect technical information for analytics and security purposes when you access the Service. This data may include your IP address, browser type, operating system, referral URLs, and pages visited. This information is anonymized and used in aggregate.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        <Text variant="body1" style={{ fontWeight: '600' }}>Information from Third Parties:</Text> We may receive information about you from third-party services, such as Google or Apple, if you use them to sign in to our Service (OAuth).
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        2. How We Use Your Information
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        We use the information we collect to:
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Provide, operate, and maintain our Service.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Create and manage your account, and verify your identity.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Send you technical notices, updates, security alerts, and administrative messages.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Send you customized lists of events and marketing communications, such as email newsletters or push notifications, should you opt-in. You may opt-out of receiving these communications at any time.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xs, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Personalize your experience by recommending events and content based on your interests and past activity (e.g., favorited or attended events).
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • Monitor and analyze trends, usage, and activities to improve the Service.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        3. How We Share Your Information
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        We do not sell your personal data. We may share information in the following situations:
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>With Service Providers:</Text> We share information with third-party vendors and service providers that perform services for us, such as database management (Supabase) and authentication (Google, Apple). These providers only have access to your information to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>User-to-User Sharing:</Text> Your public profile, which may include your name and profile photo, is visible to other users. Sensitive information such as your password, email address, and phone number will never be shared with other users. If you are accepted as a friend by another user, they may see additional information, but not your sensitive contact or account details.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>With Anonymized Data:</Text> We may use and share aggregated, anonymized data (e.g., "150 people are interested in this event") that does not identify you for analytical purposes.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>For Legal Reasons:</Text> We may disclose your information if we are required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        4. Your Rights and Data Control
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        You have control over your personal information:
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>Access and Edit:</Text> You can view, edit, or delete your personal information at any time through your account settings on the website.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>Account Deletion:</Text> You can delete your account at any time. Upon your request, we will take steps to delete all data directly associated with your account from our active databases as soon as possible. Please note that some information may be retained in our backups for a limited period or if it is linked to other users or data.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        5. Children's Privacy
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        Our Service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. Furthermore, users must be of the legal age required by their jurisdiction (e.g., 21+ in the United States) to attend events involving alcohol or other age-restricted substances.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        6. Your Privacy Rights for California and European Users
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, lineHeight: 22 }}>
        If you are a resident of California or a data subject in the European Economic Area (EEA), you have additional rights regarding your personal data under the California Consumer Privacy Act (CCPA) and the General Data Protection Regulation (GDPR), respectively.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.sm, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>For Residents of the EEA (GDPR):</Text> You have the right to access, rectify, erase, restrict the processing of, and request the portability of your personal data. You may also object to the processing of your data in certain circumstances.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, marginLeft: theme.spacing.md, lineHeight: 22 }}>
        • <Text variant="body1" style={{ fontWeight: '600' }}>For Residents of California (CCPA):</Text> You have the right to request information about the categories of personal data we have collected and the right to request the deletion of your personal data. FindLocal does not sell your personal information.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        To exercise any of these rights, please contact us at the email address provided in the "Contact Us" section below. We will comply with all applicable laws and verifiable requests.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        7. Changes to This Privacy Policy
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. For material changes, we will also provide notice to you via the email address associated with your account.
      </Text>

      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        8. Contact Us
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
        If you have any questions about this Privacy Policy, please contact us at:{' '}
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

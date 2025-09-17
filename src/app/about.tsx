import {View, ScrollView} from "react-native";
import {Text} from '../components/ui';
import { useTheme } from '../context/ThemeContext';

export default function AboutRoute() {
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
      <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>About FindLocal</Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        The idea for FindLocal is credited to co-founder Alden Harris-McCoy, who like me, thinks Instagram and other social media no longer serve their original intent of keeping us connected and informed. Unfortunately, we rely on these social media platforms as more than boredom killers (a dangerous thing already if you ask me!). We rely on them to know what our friends are up to, to know what is going on around us that is worth knowing, and to advertise our own events and gatherings. FindLocal aims to provide a much better alternative than Zuck's playground of horrors and manipulation. Every person that has worked on this project agrees: Local artists, venues, gatherings, community, and friends form the backbone of the cities we live in and the lives we want to lead. It's time there was a platform that helped you find the treasures in your backyard without all the bullshit. It's time to find local.
      </Text>
      <Text variant="body2" color="secondary" style={{ marginBottom: theme.spacing.md, fontStyle: 'italic' }}>
        Elliot Harris, Co-Founder
      </Text>
      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        But what exactly is FindLocal then?
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        FindLocal is the app for finding the best local events. See what's happening in music, theater, comedy, and more. You can filter through thousands of events from multiple major cities in an ever-expanding catalog that's updated daily. In the near future, you will be able to invite friends to events, and even allow artists to promote their own events.
      </Text>
      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        But How?
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        FindLocal utilizes modern web application technology, combined with AI assisted gathering of data from public calendars to give you a one-stop shop for any event you can possibly think of. If it's not on here yet, but it is on the internet, you can email findlocalinternal@gmail.com and it will be added promptly.
      </Text>
      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        The team:
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        FindLocal is a team of friends, family, and volunteers with a broad range of skills. From marketing to software development to business strategy to venue relations and promotion, each member plays an essential role in making this dream a reality.
      </Text>
      <Text variant="body2" color="secondary" style={{ marginBottom: theme.spacing.md, fontStyle: 'italic' }}>
        [Bio's coming soon!]
      </Text>
      <Text variant="h3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        FAQs:
      </Text>
      <Text variant="h4" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        Q: How does FindLocal make money?
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        A: We don't! We are a team of volunteers with a passion for promoting local artists and businesses, and we believe some things are worth doing even if you don't get paid.
      </Text>
      <Text variant="h4" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        Q: But would you be open to making money?
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        A: Of course, more money would allow us to broaden the scope and speed at which we can operate. If you have any business inquiries (affiliate links, advertising, partnering, etc.), please email findlocalinternal@gmail.com
      </Text>
      <Text variant="h4" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        Q: I want to help, how can I help?
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        A: The best way is by filling out this form to become a Beta tester. If you are interested in helping out in a more committal and serious way, please email findlocalinternal@gmail.com and give a brief synopsis of your skills and interest.
      </Text>
      <Text variant="h4" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        Q: Why not just ask ChatGPT what events are happening?
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
        A: While it's true that AI agents such as ChatGPT are capable of web-scraping and synopsizing data, they have three main drawbacks compared to FindLocal. They are heavily biased to what's already popular and trending, so you are unlikely to discover new places for yourself, whereas FindLocal prioritizes promoting each event equally. They are prone to hallucinations and false information, which is a safety concern. FindLocal always links you back to the real source of information for you to check for yourself. 0 hallucinations. ChatGPT steals your data, is bad for the environment, and lines the pockets of oligarchs. FindLocal does none of that.
      </Text>
      <Text variant="h4" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        Q: I want to report a bug, request a feature, or request a city or event be added to FindLocal.
      </Text>
      <Text variant="body1" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
        A: First of all, that's not a question. But please email findlocalinternal@gmail.com with all the details needed for your inquiry or report and we thank you for your engagement!
      </Text>
    </ScrollView>
  );
}
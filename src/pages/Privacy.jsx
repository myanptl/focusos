import LegalSection, { LegalPage } from '../components/legal/LegalSection'
import { strong, link, list } from '../components/legal/styles'

export default function Privacy() {
  return (
    <LegalPage kicker="Legal · Privacy" title="Privacy Policy">
      <LegalSection title="What we collect">
        When you create an account and use FocusOS, we collect the following data tied to your account:
        <ul style={list}>
          <li><strong style={strong}>Email address</strong> — used for authentication only</li>
          <li><strong style={strong}>Focus session data</strong> — duration, dates, session count, streaks</li>
          <li><strong style={strong}>Quiz results</strong> — scores, question modes, missed questions, focus scores</li>
          <li><strong style={strong}>Score goals</strong> — test type, target scores, test dates you enter</li>
          <li><strong style={strong}>App preferences</strong> — timer settings and display name</li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use your data">
        Your data is used solely to power your FocusOS experience:
        <ul style={list}>
          <li>Calculating your study streaks and focus statistics</li>
          <li>Tracking quiz history and scheduling spaced repetition reviews</li>
          <li>Generating personalized study plans based on your goals</li>
          <li>Restoring your preferences across devices and sessions</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your notes and the AI">
        <p>When you generate a quiz, the notes you paste are sent to <strong style={strong}>Anthropic&apos;s API</strong> to create questions. FocusOS does not store your notes. They are transmitted, used to generate questions, and discarded.</p>
        <p style={{ marginTop: 10 }}>We do <strong style={strong}>not</strong> use your notes or quiz content to train any AI model. Anthropic handles this data under their own privacy policy: <a href="https://anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={link}>anthropic.com/privacy</a></p>
      </LegalSection>

      <LegalSection title="What we do not do">
        <ul style={{ ...list, marginTop: 0 }}>
          <li>We do <strong style={strong}>not</strong> sell your data to any third party</li>
          <li>We do <strong style={strong}>not</strong> use your data for advertising</li>
          <li>We do <strong style={strong}>not</strong> share your data with other users</li>
          <li>We do <strong style={strong}>not</strong> store the notes you paste into the quiz generator</li>
        </ul>
      </LegalSection>

      <LegalSection title="Deleting your data">
        <p>You can reset all your focus and quiz data at any time from <strong style={strong}>Settings → Data → Reset All Data</strong>.</p>
        <p style={{ marginTop: 10 }}>To fully delete your account, email us at <a href="mailto:support@focusos.live" style={link}>support@focusos.live</a> and we will remove your account and all associated data within 7 days.</p>
      </LegalSection>

      <LegalSection title="Infrastructure">
        FocusOS is built on:
        <ul style={list}>
          <li><strong style={strong}>Supabase</strong> — database and authentication. Their privacy policy: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={link}>supabase.com/privacy</a></li>
          <li><strong style={strong}>Vercel</strong> — hosting and serverless functions. Their privacy policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={link}>vercel.com/legal/privacy-policy</a></li>
        </ul>
      </LegalSection>

      <LegalSection title="Contact">
        Questions about this policy? Email <a href="mailto:support@focusos.live" style={link}>support@focusos.live</a>
      </LegalSection>
    </LegalPage>
  )
}

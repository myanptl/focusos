import LegalSection, { LegalPage } from '../components/legal/LegalSection'
import { strong, link, list } from '../components/legal/styles'

export default function Terms() {
  return (
    <LegalPage kicker="Legal · Terms" title="Terms of Service">
      <LegalSection title="Overview">
        FocusOS is a study tool for personal educational use. By creating an account and using FocusOS, you agree to these terms. If you do not agree, do not use the service.
      </LegalSection>

      <LegalSection title="Eligibility">
        You must be at least <strong style={strong}>13 years old</strong> to create an account. If you are under 18, you confirm that you have permission from a parent or guardian to use FocusOS.
      </LegalSection>

      <LegalSection title="Acceptable use">
        <ul style={{ ...list, marginTop: 0 }}>
          <li>FocusOS is for personal, non-commercial educational use only</li>
          <li>Do not upload copyrighted material as notes if you do not have the right to do so</li>
          <li>Do not attempt to abuse, overload, or circumvent the quiz generator&apos;s rate limits</li>
          <li>Do not attempt to reverse-engineer, scrape, or automate requests to the service</li>
          <li>Do not use FocusOS in any way that violates applicable law</li>
        </ul>
      </LegalSection>

      <LegalSection title="Account suspension">
        We reserve the right to suspend or terminate accounts that violate these terms without prior notice. If you believe your account was suspended in error, contact <a href="mailto:support@focusos.live" style={link}>support@focusos.live</a>.
      </LegalSection>

      <LegalSection title="No guarantees">
        <p>FocusOS is provided <strong style={strong}>as-is</strong> with no guarantees of academic outcome, test score improvement, or service uptime. Study tools support learning — they do not replace it.</p>
        <p style={{ marginTop: 10 }}>The AI-generated quiz questions are created for study purposes and may contain errors. Always verify important information against your primary source materials.</p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        We may update these terms from time to time. Continued use of FocusOS after changes are posted constitutes acceptance of the updated terms.
      </LegalSection>

      <LegalSection title="Contact">
        Questions about these terms? Email <a href="mailto:support@focusos.live" style={link}>support@focusos.live</a>
      </LegalSection>
    </LegalPage>
  )
}

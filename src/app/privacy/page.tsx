import LegalLayout from '@/components/layout/LegalLayout'

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Notice" label="Your data">
      <section>
        <h2 className="text-xl font-semibold mb-2">Who is responsible</h2>
        <p>Dr Richard May operates BehaviorLingo personally and is responsible for the personal information used by this service. For privacy questions or requests, email <a className="underline" href="mailto:richard.may@southwales.ac.uk">richard.may@southwales.ac.uk</a>.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Information used</h2>
        <p>When you create an account, we use your email address, password credentials managed by our authentication provider, and your name if you choose to provide one. We record quiz attempts, answers, scores and timings to run practice and show your progress. Essential technical logs help operate and secure the service.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Why we use it</h2>
        <p>Account and quiz information is needed to provide the learning service you request. Essential security and operational records help protect the service and resolve faults. We do not use your identifiable learning records for a university research study without giving you separate information and an appropriate participation process.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Providers and storage</h2>
        <p>Supabase provides authentication and stores learning records; Vercel hosts the website. Their systems may process technical and account information to provide the service. If paid access is introduced, the payment page and this notice will explain the payment provider and the additional information used before you pay.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Browser storage</h2>
        <p>The site uses browser storage needed to keep you signed in. Non-essential analytics or marketing technologies will require a separate explanation and, where required, your choice before they are enabled.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">How long we keep it</h2>
        <p>We keep account and learning records while your account remains active. You can request deletion using the contact address above. Some information may need to be kept longer where a legal obligation applies.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Your choices and rights</h2>
        <p>You can ask to access, correct or delete your personal information, and may have other rights depending on the circumstances. Contact us at the address above. You can also complain to the <a className="underline" href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">Information Commissioner’s Office</a>.</p>
      </section>
    </LegalLayout>
  )
}
